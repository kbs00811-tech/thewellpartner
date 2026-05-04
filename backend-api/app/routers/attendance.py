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
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
):
    """
    PDF 출근부 + 청구 엑셀 → 근태/연차 자동 입력된 엑셀 반환.

    응답:
      - 헤더 X-Process-Result: JSON 통계 (인코딩됨)
      - 본문: 완성 엑셀 바이너리
    """
    verify_admin_token(x_admin_token, authorization)

    if not pdf.filename or not excel.filename:
        raise HTTPException(400, "PDF와 Excel 파일이 모두 필요합니다.")

    paid_holidays = _parse_holidays(holidays)
    sheet_name_final = sheet_name.strip() if sheet_name and sheet_name.strip() else None

    tmp_dir = Path(tempfile.mkdtemp(prefix="attendance_"))
    try:
        pdf_path = tmp_dir / pdf.filename
        excel_orig_path = tmp_dir / excel.filename
        excel_out_path = tmp_dir / excel.filename.replace(".xlsx", "_근태연차자동입력완료.xlsx")

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

        # 2. 원본 복사
        shutil.copyfile(excel_orig_path, excel_out_path)

        # 3. 근태 입력
        try:
            att_result = fill_attendance_sheet(
                str(excel_out_path),
                pdf_data,
                year=year,
                month=month,
                sheet_name=sheet_name_final,
                paid_holidays=paid_holidays,
                standard_hours=standard_hours,
                normal_start=normal_start,
                normal_end=normal_end,
                overwrite_existing=overwrite_existing,
            )
        except ValueError as e:
            raise HTTPException(422, str(e))

        wb = att_result["wb"]

        # 4. 분류 결과 재생성 (연차 만근용)
        classified_per_employee = {}
        for name, days in pdf_data.items():
            classified = {}
            for day in range(1, 32):
                classified[day] = classify_attendance(
                    days.get(day, {}),
                    year, month, day,
                    paid_holidays, normal_start, normal_end,
                )
            classified_per_employee[name] = classified

        # 5. 연차 입력
        leave_result = fill_leave_sheet(
            wb,
            pdf_data,
            classified_per_employee,
            year=year,
            month=month,
            sheet_name=leave_sheet_name,
        )

        wb.save(str(excel_out_path))

        # 6. 검증
        validation = validate(str(excel_orig_path), str(excel_out_path))

        # 7. 검토리스트 시트 추가
        wb_check = load_workbook(str(excel_out_path), data_only=False)
        write_validation_to_review(wb_check, validation)

        if "자동입력_검토리스트" in wb_check.sheetnames:
            ws_review = wb_check["자동입력_검토리스트"]
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
            ws_review.append([])
            ws_review.append(["연차 입력 검토"])
            for r in leave_result.get("review_list", []):
                ws_review.append([
                    r.get("구분", ""), r.get("성명", ""),
                    "", "", "", "", r.get("메시지", "")
                ])
        wb_check.save(str(excel_out_path))

        # 8. 응답 빌드
        with open(excel_out_path, "rb") as f:
            content = f.read()

        result_summary = {
            "pdf_meta": {
                "year": meta.get("year"),
                "month": meta.get("month"),
                "total_employees": meta.get("total_employees"),
                "raw_pages": meta.get("raw_pages"),
            },
            "attendance": {
                "filled_employees": len(att_result["stats"]),
                "total_cells": sum(att_result["stats"].values()),
                "missing": att_result["missing"],
            },
            "leave": {
                "filled_employees": len(leave_result.get("stats", {})),
                "missing": leave_result.get("missing", []),
            },
            "validation": validation["summary"],
            "validation_ok": validation["ok"],
            "review_count": len(att_result["review_list"]) + len(leave_result.get("review_list", [])),
        }

        from urllib.parse import quote
        encoded_summary = json.dumps(result_summary, ensure_ascii=False)
        out_filename = excel_out_path.name
        # RFC 5987: 한글 파일명을 UTF-8로 percent-encode
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
