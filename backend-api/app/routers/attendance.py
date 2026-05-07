"""
근태 자동 입력 API 라우터
POST /api/attendance/process
"""
from __future__ import annotations
import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Response
from openpyxl import load_workbook

from ..services.attendance_parser import parse_pdf
from ..services.excel_writer import (
    fill_attendance_sheet,
    classify_attendance,
    extract_employee_names_from_sheet,
    find_target_sheet,
    find_employee_block,
    DAY_TO_COL,
)
from ..services.leave_writer import fill_leave_sheet
from ..services.validator import validate, write_validation_to_review
from ..services.hire_date import (
    extract_hire_dates_from_excel,
    estimate_hire_dates_from_pdf,
    merge_hire_dates,
    find_feb_attendance_sheet,
    check_feb_last_week_credit,
)
from ..services.completeness import verify_input_completeness
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
    fill_leave: bool = Form(False),
    enforce_pdf_month: bool = Form(True),
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
):
    """
    PDF 출근부 + 청구 엑셀 → 근태 자동 입력된 엑셀 반환.
    수식/서식은 100% 보존.

    처리 순서:
      1. 엑셀 직원명 + 입사일 사전 추출
      2. PDF 파싱 (직원명 매칭 + 날짜 보정)
      3. PDF month vs user month 검증
      4. PDF 첫 활동일 기반 입사일 추정 (엑셀에서 못 찾은 경우 보완)
      5. 2월 근태 시트 마지막 주 인정 검사 (3/1 주휴 판단용)
      6. 근태 시트 자동 입력 (입사일 게이트 적용)
      7. 입력 누락 검증
      8. 검토리스트 + 결과 반환
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

        # 1. 엑셀 사전 로드 — 직원명 + 입사일 + 2월 시트
        excel_names: list[str] = []
        hire_dates_excel: dict = {}
        feb_sheet_name: Optional[str] = None
        feb_credit_map: dict = {}

        try:
            wb_pre = load_workbook(str(excel_orig_path), data_only=False, read_only=False)
            try:
                march_sheet = find_target_sheet(wb_pre, month, sheet_name_final)
                excel_names = extract_employee_names_from_sheet(wb_pre, march_sheet)

                # 직원정보 시트가 있으면 같이 검색
                candidate_sheets = [march_sheet]
                for sn in wb_pre.sheetnames:
                    if "직원" in sn or "정보" in sn:
                        candidate_sheets.append(sn)
                hire_dates_excel = extract_hire_dates_from_excel(
                    wb_pre, candidate_sheets, excel_names
                )

                # 2월 시트
                feb_sheet_name = find_feb_attendance_sheet(wb_pre, year, month)
                if feb_sheet_name:
                    for nm in excel_names:
                        result_check = check_feb_last_week_credit(
                            wb_pre, feb_sheet_name, nm, year,
                            feb_month=month - 1,
                            day_to_col=DAY_TO_COL,
                        )
                        feb_credit_map[nm] = result_check
            finally:
                wb_pre.close()
        except Exception:
            excel_names = []
            hire_dates_excel = {}

        # 2. PDF 파싱
        try:
            pdf_data, meta = parse_pdf(str(pdf_path), expected_names=excel_names)
        except Exception as e:
            raise HTTPException(422, f"PDF 파싱 실패: {e}")

        if not pdf_data:
            raise HTTPException(422, "PDF에서 직원 정보를 찾지 못했습니다.")

        # 3. PDF month/year 검증
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

        # 4. PDF 첫 활동일 기반 입사일 추정 (엑셀에서 못 찾은 직원 보완)
        hire_dates_pdf = estimate_hire_dates_from_pdf(pdf_data, target_year, target_month)
        hire_dates = merge_hire_dates(hire_dates_excel, hire_dates_pdf)

        # 5. 원본 복사 후 수정
        shutil.copyfile(excel_orig_path, excel_out_path)

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
                hire_dates=hire_dates,
                feb_credit_map=feb_credit_map,
            )
        except ValueError as e:
            raise HTTPException(422, str(e))

        wb = att_result["wb"]
        leave_result = {"stats": {}, "missing": [], "review_list": []}

        # 6. 연차 입력 (옵션)
        if fill_leave:
            classified_per_employee = {}
            for name, days in pdf_data.items():
                from ..services.attendance_parser import normalize_name as _nn
                emp_hire = hire_dates.get(_nn(name))
                classified = {}
                for day in range(1, 32):
                    classified[day] = classify_attendance(
                        days.get(day, {}),
                        target_year, target_month, day,
                        att_result["merged_holidays"], normal_start, normal_end,
                        hire_date=emp_hire,
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

        # 7. 입력 누락 검증
        from ..services.attendance_parser import normalize_name as _nn
        ws_used = wb[att_result["sheet_used"]]
        employee_blocks = {}
        for name in pdf_data.keys():
            blk = find_employee_block(ws_used, name)
            if blk:
                employee_blocks[name] = blk

        # hire_dates의 키는 이미 normalize됨. pdf_data 키와 동일하게 매핑
        hire_dates_for_verify = {}
        for name in pdf_data.keys():
            nn = _nn(name)
            if nn in hire_dates:
                hire_dates_for_verify[name] = hire_dates[nn]

        missing_entries = verify_input_completeness(
            ws_used,
            pdf_data,
            employee_blocks,
            hire_dates_for_verify,
            att_result["merged_holidays"],
            target_year,
            target_month,
            DAY_TO_COL,
        )

        # 8. 1차 저장 + 검증 + 검토리스트 추가
        wb.save(str(excel_out_path))
        validation = validate(str(excel_orig_path), str(excel_out_path))

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
            ws_review.append(["엑셀직원명_추출수", str(len(excel_names))])
            ws_review.append(["PDF매칭직원수", str(len(meta.get("matched_employees", [])))])
            ws_review.append(["2월시트_사용", str(feb_sheet_name or "없음")])

            # 입사일 정보
            ws_review.append([])
            ws_review.append(["입사일 정보"])
            ws_review.append(["직원명_정규화", "입사일", "출처"])
            for nm in excel_names:
                hd = hire_dates.get(nm)
                if hd is not None:
                    src = "엑셀" if nm in hire_dates_excel else "PDF추정"
                    ws_review.append([nm, str(hd), src])
                else:
                    ws_review.append([nm, "(미확인)", "정상직원으로_가정"])

            # 2월 인정 결과
            ws_review.append([])
            ws_review.append(["2월 마지막 주 인정 결과 (3/1 주휴 판단용)"])
            ws_review.append(["직원명_정규화", "결과"])
            for nm in excel_names:
                v = feb_credit_map.get(nm)
                if v is True:
                    ws_review.append([nm, "인정"])
                elif v is False:
                    ws_review.append([nm, "불인정"])
                else:
                    ws_review.append([nm, "(2월 시트 또는 직원 못 찾음)"])

            # 카운터 요약
            ws_review.append([])
            ws_review.append(["카운터 요약 (0이면 성공)"])
            ws_review.append(["항목", "건수"])
            counters = att_result.get("counters", {})
            for k in [
                "직원_매칭실패",
                "수식셀_덮어쓰기",
                "3월1일_주휴제외",
                "3월2일_유급제외",
            ]:
                ws_review.append([k, str(counters.get(k, 0))])

            ws_review.append([])
            ws_review.append(["기타 카운터"])
            for k in [
                "주말근무_연장행입력",
                "공휴일_유급_입력",
                "주휴_자동입력",
                "연장_텍스트_충돌",
                "일요일주휴_제외",
                "주휴_기본칸_충돌",
                "주휴_표기칸_충돌",
                "유급수정_잘못된주휴",
                "입사일_확인필요",
                "입사전_자동입력_제외",
            ]:
                ws_review.append([k, str(counters.get(k, 0))])

            # 적용 공휴일
            ws_review.append([])
            ws_review.append(["적용 공휴일 (자동 + 사용자 입력)"])
            ws_review.append(["일자", "이름"])
            for date_str, hname in sorted(att_result["merged_holidays"].items()):
                ws_review.append([date_str, hname])

            # PDF 날짜 보정 내역
            day_corrections = meta.get("day_corrections", [])
            if day_corrections:
                ws_review.append([])
                ws_review.append(["PDF 날짜 시퀀스 보정 (raw → corrected)"])
                ws_review.append(["페이지", "raw_day", "corrected_day", "context"])
                for c in day_corrections:
                    ws_review.append([
                        str(c.get("page", "")),
                        str(c.get("raw", "")),
                        str(c.get("corrected", "")),
                        c.get("context", "")
                    ])

            # 입력 누락 검증 결과
            if missing_entries:
                ws_review.append([])
                ws_review.append([f"입력 누락 검증 ({len(missing_entries)}건)"])
                ws_review.append(["구분", "성명", "일자", "요일", "PDF원문", "입력값", "메시지"])
                for m in missing_entries[:200]:
                    ws_review.append([
                        m.get("구분", ""), m.get("성명", ""),
                        m.get("일자", ""), m.get("요일", ""),
                        m.get("PDF원문", ""), m.get("입력값", ""),
                        m.get("메시지", "")
                    ])

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

            # 수식 셀 보호 로그
            log = att_result.get("log", [])
            formula_protect = [e for e in log if e.get("kind") == "수식셀_보호"]
            if formula_protect:
                ws_review.append([])
                ws_review.append(["수식 셀 보호 로그 (덮어쓰지 않고 건너뜀)"])
                ws_review.append(["시트", "셀", "수식", "건너뛴값"])
                for e in formula_protect[:100]:
                    ws_review.append([
                        e.get("sheet", ""), e.get("cell", ""),
                        e.get("formula", ""), str(e.get("skipped_value", "")),
                    ])

            if fill_leave and leave_result.get("review_list"):
                ws_review.append([])
                ws_review.append(["연차 입력 검토"])
                ws_review.append(["구분", "성명", "메시지"])
                for r in leave_result.get("review_list", []):
                    ws_review.append([
                        r.get("구분", ""), r.get("성명", ""), r.get("메시지", "")
                    ])

        wb_final.save(str(excel_out_path))

        with open(excel_out_path, "rb") as f:
            content = f.read()

        result_summary = {
            "pdf_meta": {
                "year": meta.get("year"),
                "month": meta.get("month"),
                "total_employees": meta.get("total_employees"),
                "raw_pages": meta.get("raw_pages"),
                "day_corrections": len(meta.get("day_corrections", [])),
                "matched_employees": len(meta.get("matched_employees", [])),
            },
            "target": {
                "year": target_year,
                "month": target_month,
                "sheet_used": att_result["sheet_used"],
                "month_warning": month_warning,
                "feb_sheet": feb_sheet_name,
            },
            "hire_dates": {
                "from_excel": len(hire_dates_excel),
                "from_pdf_estimate": len(hire_dates_pdf),
                "total": len(hire_dates),
            },
            "attendance": {
                "filled_employees": len(att_result["stats"]),
                "total_cells": sum(att_result["stats"].values()),
                "missing": att_result["missing"],
                "counters": att_result.get("counters", {}),
            },
            "completeness": {
                "missing_entries": len(missing_entries),
            },
            "leave": {
                "filled_employees": len(leave_result.get("stats", {})),
                "missing": leave_result.get("missing", []),
                "skipped": not fill_leave,
            },
            "validation": validation["summary"],
            "validation_ok": validation["ok"],
            "review_count": (
                len(att_result["review_list"])
                + len(leave_result.get("review_list", []))
                + len(missing_entries)
            ),
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
