"""
근태 자동 입력 API 라우터
POST /api/attendance/process
"""
from __future__ import annotations
import io
import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Response
from openpyxl import load_workbook

from ..services.attendance_parser import parse_pdf
from ..services.excel_writer import fill_attendance_sheet, classify_attendance
from ..services.leave_writer import fill_leave_sheet
from ..services.validator import validate, write_validation_to_review
from ..auth import verify_admin_token

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _parse_holidays(holidays_text: str) -> dict:
    """공휴일 텍스트 → dict ('2026-05-05 어린이날\n...' 형식)"""
    result = {}
    if not holidays_text:
        return result
    for line in holidays_text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if parts:
            result[parts[0]] = parts[1] if len(parts) > 1 else "공휴일"
    return result


@router.post("/process")
async def process_attendance(
    pdf: UploadFile = File(...),
    excel: UploadFile = File(...),
    year: int = Form(...),
    month: int = Form(...),
    holidays: str = Form(""),
    standard_hours: int = Form(209),
    normal_start: str = Form("08:30"),
    normal_end: str = Form("17:30"),
    sheet_name: Optional[str] = Form(None),
    leave_sheet_name: str = Form("연차내역"),
    overwrite_existing: bool = Form(False),
    fill_leave: bool = Form(False),  # 이번 단계: 연차내역 시트 미입력
    enforce_pdf_month: bool = Form(True),  # PDF month와 user month 불일치 시 PDF 기준 사용
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
):
    """
    PDF 출근부 + 청구 엑셀 → 근태 자동 입력된 엑셀 반환.
    수식/서식은 100% 보존.

    응답:
      - 헤더 X-Process-Result: JSON 통계 (utf-8 hex 인코딩)
      - 본문: 완성 엑셀 바이너리
    """
    verify_admin_token(x_admin_token, authorization)

    if not pdf.filename or not excel.filename:
        raise HTTPException(400, "PDF와 Excel 파일이 모두 필요합니다.")

    user_holidays = _parse_holidays(holidays)
    sheet_name_final = sheet_name.strip() if sheet_name and sheet_name.strip() else None

    tmp_dir = Path(tempfile.mkdtemp(prefix="attendance_"))
    try:
        pdf_path = tmp_dir / pdf.filename
        excel_orig_path = tmp_dir / excel.filename
        excel_out_path = tmp_dir / excel.filename.replace(
            ".xlsx", "_근태자동입력_수정완료.xlsx"
        )

        with open(pdf_path, "wb") as f:
            f.write(await pdf.read())
        with open(excel_orig_path, "wb") as f:
            f.write(await excel.read())

        # 1. PDF 파싱
        try:
            pdf_data, meta = parse_pdf(str(pdf_path))
        except Exception as e:
            raise HTTPException(422, f"PDF 파싱 실패: {e}")

        if not pdf_data:
            raise HTTPException(422, "PDF에서 직원 정보를 찾지 못했습니다.")

        # 1.5. PDF month/year vs user month/year 일관성 검증
        pdf_month = meta.get("month")
        pdf_year = meta.get("year")
        target_year = year
        target_month = month
        month_warning: Optional[str] = None

        if enforce_pdf_month and pdf_month and pdf_month != month:
            month_warning = (
                f"⚠️ 사용자 입력 월({year}-{month:02d})과 "
                f"PDF 출근부 월({pdf_year or year}-{pdf_month:02d}) 불일치 — "
                f"PDF 기준으로 처리합니다."
            )
            target_month = pdf_month
            if pdf_year:
                target_year = pdf_year

        # 2. 원본 복사
        shutil.copyfile(excel_orig_path, excel_out_path)

        # 3. 근태 입력 (단일 wb로 모든 작업 수행)
        try:
            att_result = fill_attendance_sheet(
                str(excel_out_path),
                pdf_data,
                year=target_year,
                month=target_month,
                sheet_name=sheet_name_final,
                paid_holidays=user_holidays,
                standard_hours=standard_hours,
                normal_start=normal_start,
                normal_end=normal_end,
                overwrite_existing=overwrite_existing,
            )
        except ValueError as e:
            raise HTTPException(422, str(e))

        wb = att_result["wb"]
        leave_result = {"stats": {}, "missing": [], "review_list": []}

        # 4. 연차 입력 (옵션, 기본 비활성화)
        if fill_leave:
            classified_per_employee = {}
            for name, days in pdf_data.items():
                classified = {}
                for day in range(1, 32):
                    classified[day] = classify_attendance(
                        days.get(day, {}),
                        target_year, target_month, day,
                        att_result["merged_holidays"], normal_start, normal_end,
                    )
                classified_per_employee[name] = classified

            leave_result = fill_leave_sheet(
                wb,
                pdf_data,
                classified_per_employee,
                year=target_year,
                month=target_month,
                sheet_name=leave_sheet_name,
            )

        # 5. 검증 — 원본과 현재 wb 비교
        # 검증을 위해 임시 저장 → load → 검증 → 검토리스트 추가 → 최종 save
        # (단일 save를 위해 메모리상 wb 사용)
        wb.save(str(excel_out_path))
        validation = validate(str(excel_orig_path), str(excel_out_path))

        # 6. 검토리스트 시트 추가 (한 번 더 load → 검토리스트 append → 최종 save)
        wb_final = load_workbook(str(excel_out_path), data_only=False)
        write_validation_to_review(wb_final, validation)

        if "자동입력_검토리스트" in wb_final.sheetnames:
            ws_review = wb_final["자동입력_검토리스트"]

            # 처리 메타
            ws_review.append([])
            ws_review.append(["처리 메타"])
            ws_review.append(["대상연도", str(target_year)])
            ws_review.append(["대상월", str(target_month)])
            ws_review.append(["사용시트", att_result["sheet_used"]])
            if month_warning:
                ws_review.append(["월불일치_경고", month_warning])
            ws_review.append(["기준시간", str(standard_hours)])
            ws_review.append(["정상출근", normal_start])
            ws_review.append(["정상퇴근", normal_end])

            # 적용된 공휴일
            ws_review.append([])
            ws_review.append(["적용 공휴일"])
            ws_review.append(["일자", "이름"])
            for date_str, hname in sorted(att_result["merged_holidays"].items()):
                ws_review.append([date_str, hname])

            # 근태 입력 검토
            ws_review.append([])
            ws_review.append(["근태 입력 검토"])
            ws_review.append(["구분", "성명", "일자", "요일", "PDF원문", "입력값", "메시지"])
            for r in att_result["review_list"]:
                ws_review.append([
                    r.get("구분", ""), r.get("성명", ""),
                    r.get("일자", ""), r.get("요일", ""),
                    r.get("PDF원문", ""), str(r.get("입력값", "")),
                    r.get("메시지", "")
                ])

            # 연차 입력 검토 (옵션)
            if fill_leave and leave_result.get("review_list"):
                ws_review.append([])
                ws_review.append(["연차 입력 검토"])
                ws_review.append(["구분", "성명", "메시지"])
                for r in leave_result.get("review_list", []):
                    ws_review.append([
                        r.get("구분", ""), r.get("성명", ""), r.get("메시지", "")
                    ])

        wb_final.save(str(excel_out_path))

        # 7. 응답 빌드
        with open(excel_out_path, "rb") as f:
            content = f.read()

        result_summary = {
            "pdf_meta": {
                "year": meta.get("year"),
                "month": meta.get("month"),
                "total_employees": meta.get("total_employees"),
                "raw_pages": meta.get("raw_pages"),
            },
            "target": {
                "year": target_year,
                "month": target_month,
                "sheet_used": att_result["sheet_used"],
                "month_warning": month_warning,
            },
            "attendance": {
                "filled_employees": len(att_result["stats"]),
                "total_cells": sum(att_result["stats"].values()),
                "missing": att_result["missing"],
            },
            "leave": {
                "filled_employees": len(leave_result.get("stats", {})),
                "missing": leave_result.get("missing", []),
                "skipped": not fill_leave,
            },
            "validation": validation["summary"],
            "validation_ok": validation["ok"],
            "review_count": len(att_result["review_list"]) + len(leave_result.get("review_list", [])),
        }

        from urllib.parse import quote
        encoded_summary = json.dumps(result_summary, ensure_ascii=False)
        out_filename = excel_out_path.name
        ascii_fallback = "result.xlsx"
        utf8_filename = quote(out_filename, safe="")

        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{utf8_filename}",
                "X-Process-Result": encoded_summary.encode("utf-8").hex(),
                "Access-Control-Expose-Headers": "X-Process-Result, Content-Disposition",
            },
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.post("/preview")
async def preview_pdf(
    pdf: UploadFile = File(...),
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
):
    """PDF만 파싱해서 미리보기 (엑셀 처리 X)"""
    verify_admin_token(x_admin_token, authorization)

    tmp_dir = Path(tempfile.mkdtemp(prefix="preview_"))
    try:
        pdf_path = tmp_dir / pdf.filename
        with open(pdf_path, "wb") as f:
            f.write(await pdf.read())

        pdf_data, meta = parse_pdf(str(pdf_path))

        rows = []
        for name, days in pdf_data.items():
            for day, slot in days.items():
                if slot.get("start") or slot.get("end") or slot.get("note"):
                    rows.append({
                        "name": name,
                        "day": day,
                        "start": slot.get("start", ""),
                        "end": slot.get("end", ""),
                        "ot": slot.get("ot", ""),
                        "note": slot.get("note", ""),
                    })

        return {
            "meta": meta,
            "employees": list(pdf_data.keys()),
            "rows": rows,
        }
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
