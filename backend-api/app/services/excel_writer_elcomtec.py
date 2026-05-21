"""
엘컴텍 근태 시트 자동 입력 (검증된 매핑 규칙, 완성본 대조 599/600)

매핑 규칙 (직원당 6행: 기본/연장/심야/특근/특잔/지각조퇴):
  - 평일 근무(평_기본 있음): 기본=8 고정, 연장+=평_연장, 심야+=평_야간
      · 평_기본<8(지각/조퇴) → 지각조퇴는 operator 수동(검토플래그만)
      · 평_기본 없음(결근) → 수동 분류(휴무/연차/반차) 검토플래그
  - 토요일(구분=무휴, 휴_기본 있음): 연장=휴_기본, 특잔+=휴_연장
  - 일요일 근무(구분=주휴, 휴_기본 있음): 특근=휴_기본, 특잔+=휴_연장
  - 주휴 개근룰: 각 일요일, 직전 월~금 평일 결근 0 & 평일 기록 전부 존재 → 기본[일]=8, 연장[일]='주휴'
      (월경계 전월 평일은 개근 가정 / 월중 평일 기록없음=입사전·퇴사후 → 미완근)

수동영역(자동입력 X): 지각조퇴 deduction, 연차/반차/휴무/퇴사 재분류, PDF없는 OT추가
"""
from __future__ import annotations
import datetime
from typing import Optional

from openpyxl import load_workbook

from .excel_writer import (
    DAY_TO_COL,
    find_target_sheet,
    build_name_to_row_map,
    find_employee_block,
    safe_set_value,
    safe_set_value_with_protection,
    get_dow,
    normalize_name,
)


def _is_absent_weekday(rec: Optional[dict]) -> bool:
    """월중 평일인데 기록없음(None) or 평일 결근(평_기본 없음) → 미완근"""
    if rec is None:
        return True
    if rec.get("구분") == "평일" and not rec.get("평_기본"):
        return True
    return False


def _week_full_attendance(days: dict, sunday: datetime.date, month: int) -> bool:
    """일요일 직전 월~금(5일) 개근 여부. 토요일은 주휴 판정에 무관."""
    monday = sunday - datetime.timedelta(days=6)
    for off in range(5):  # Mon..Fri
        wd = monday + datetime.timedelta(days=off)
        if wd.month != month:
            continue  # 전월은 개근 가정
        if _is_absent_weekday(days.get(wd.day)):
            return False
    return True


def fill_attendance_sheet_elcomtec(
    excel_path: str,
    parsed: dict,
    year: int,
    month: int,
    sheet_name: Optional[str] = None,
    name_to_row: Optional[dict] = None,
) -> dict:
    """엘컴텍 근태 시트 자동 입력. excel_path를 in-place 수정 후 wb 반환.

    name_to_row: {정규화이름: 기본행} — 미리 계산된 매핑(원본 캐시 기반) 주입 가능.
                 None 이면 excel_path 에서 직접 추출(원본 VLOOKUP 캐시 필요).
    """
    wb = load_workbook(excel_path, data_only=False, keep_links=False)
    sheet_used = find_target_sheet(wb, month, sheet_name)
    ws = wb[sheet_used]

    if name_to_row is None:
        name_to_row = build_name_to_row_map(excel_path, sheet_used)

    log: list = []
    review: list = []
    stats: dict = {}
    missing: list = []
    counters = {
        "직원_매칭실패": 0,
        "평일결근_수동분류필요": 0,
        "지각조퇴_수동확인": 0,
        "주휴_자동입력": 0,
        "토요일_연장입력": 0,
        "일요일_특근입력": 0,
        "주휴_충돌": 0,
    }

    for name, days in parsed.items():
        block = find_employee_block(ws, name, name_to_row)
        if not block:
            counters["직원_매칭실패"] += 1
            missing.append(name)
            review.append({
                "구분": "매칭실패", "성명": name, "일자": "", "요일": "",
                "PDF원문": "", "입력값": "",
                "메시지": f"근태 시트에서 '{name}' 블록을 찾지 못함 (이름/철자 확인)",
            })
            continue

        filled = 0
        r_기본 = block["기본"]
        r_연장 = block["연장"]
        r_심야 = block["심야"]
        r_특근 = block["특근"]
        r_특잔 = block["특잔"]

        for day, rec in days.items():
            col = DAY_TO_COL.get(day)
            if not col:
                continue
            gb = rec.get("구분")
            ot = rec.get("출결")
            date_str = f"{year}-{month:02d}-{day:02d}"
            dow = get_dow(year, month, day)

            if gb == "평일":
                base = rec.get("평_기본")
                if base:
                    if safe_set_value(ws, r_기본, col, 8, log):
                        filled += 1
                    if base < 8:
                        counters["지각조퇴_수동확인"] += 1
                        review.append({
                            "구분": "지각조퇴_수동", "성명": name, "일자": date_str, "요일": dow,
                            "PDF원문": f"평일기본 {base}h", "입력값": "기본=8",
                            "메시지": f"부족 {round(8-base,2)}h → 지각조퇴 행 수동 확인 필요",
                        })
                    pe = rec.get("평_연장")
                    if pe and safe_set_value(ws, r_연장, col, pe, log):
                        filled += 1
                    pn = rec.get("평_야간")
                    if pn and safe_set_value(ws, r_심야, col, pn, log):
                        filled += 1
                else:
                    counters["평일결근_수동분류필요"] += 1
                    review.append({
                        "구분": "평일결근_수동분류", "성명": name, "일자": date_str, "요일": dow,
                        "PDF원문": f"출결={ot or '결근'}", "입력값": "",
                        "메시지": "휴무/연차/반차 중 수동 분류 필요 (개근·주휴 영향)",
                    })

            elif gb == "무휴":  # 토요일
                hb = rec.get("휴_기본")
                if hb:
                    if safe_set_value(ws, r_연장, col, hb, log):
                        filled += 1
                        counters["토요일_연장입력"] += 1
                    he = rec.get("휴_연장")
                    if he and safe_set_value(ws, r_특잔, col, he, log):
                        filled += 1

            elif gb == "주휴":  # 일요일
                hb = rec.get("휴_기본")
                if hb:
                    if safe_set_value(ws, r_특근, col, hb, log):
                        filled += 1
                        counters["일요일_특근입력"] += 1
                    he = rec.get("휴_연장")
                    if he and safe_set_value(ws, r_특잔, col, he, log):
                        filled += 1

        # 주휴 개근룰 (일요일 기본=8 + 연장='주휴')
        for day, rec in days.items():
            if rec.get("구분") != "주휴":
                continue
            sunday = datetime.date(year, month, day)
            if not _week_full_attendance(days, sunday, month):
                continue
            col = DAY_TO_COL.get(day)
            if not col:
                continue
            if safe_set_value(ws, r_기본, col, 8, log):
                filled += 1
            ok = safe_set_value_with_protection(
                ws, r_연장, col, "주휴", log, review, name, f"{year}-{month:02d}-{day:02d}",
                "주휴_충돌",
            )
            if ok:
                filled += 1
                counters["주휴_자동입력"] += 1
            else:
                counters["주휴_충돌"] += 1

        stats[name] = filled

    return {
        "wb": wb,
        "sheet_used": sheet_used,
        "stats": stats,
        "missing": missing,
        "review_list": review,
        "log": log,
        "counters": counters,
    }
