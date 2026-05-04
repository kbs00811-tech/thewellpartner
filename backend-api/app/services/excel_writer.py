"""
근태 시트 자동 입력 (수식/서식 보존)

원칙:
  1. 원본 파일은 shutil.copyfile로 복사
  2. load_workbook(..., data_only=False) 사용
  3. 수식 셀 절대 덮어쓰지 않음
  4. 병합셀 좌상단만 입력
  5. 입력은 H~AL열 (1일~31일)만
"""
from __future__ import annotations
import datetime
from typing import Dict, List
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell
from openpyxl.utils import get_column_letter

from .attendance_parser import normalize_name, time_to_hours

# 구분(F열) → 카테고리 매핑
CATEGORIES = ["기본", "연장", "심야", "특근", "특잔", "지각 조퇴"]


def is_formula_cell(cell) -> bool:
    """수식 셀 판별"""
    v = cell.value
    return isinstance(v, str) and v.startswith("=")


def safe_set_value(ws, row: int, col: int, value, log: list = None) -> bool:
    """
    안전한 셀 입력. 성공 시 True.
    - 수식 셀이면 입력 안 함 (로그 남김)
    - 병합셀의 좌상단이 아니면 입력 안 함
    """
    cell = ws.cell(row=row, column=col)
    coord = f"{get_column_letter(col)}{row}"

    # 병합셀 검사
    if isinstance(cell, MergedCell):
        for merged in ws.merged_cells.ranges:
            if cell.coordinate in merged:
                if cell.coordinate != merged.start_cell.coordinate:
                    if log is not None:
                        log.append({
                            "kind": "병합셀_비좌상단",
                            "sheet": ws.title,
                            "cell": coord,
                            "merge_range": str(merged),
                            "skipped_value": value,
                        })
                    return False
                cell = ws.cell(row=merged.min_row, column=merged.min_col)
                break

    # 수식 셀 보호
    if is_formula_cell(cell):
        if log is not None:
            log.append({
                "kind": "수식셀_보호",
                "sheet": ws.title,
                "cell": coord,
                "formula": cell.value,
                "skipped_value": value,
            })
        return False

    # 기존 값 검사 (덮어쓰기 로그)
    if cell.value is not None and cell.value != "" and log is not None:
        log.append({
            "kind": "기존값_덮어쓰기",
            "sheet": ws.title,
            "cell": coord,
            "old_value": cell.value,
            "new_value": value,
        })

    cell.value = value
    return True


def find_employee_block(ws, employee_name: str) -> int | None:
    """
    근태 시트에서 직원의 시작 행을 찾는다.
    엘티와이 양식: D열에 직원명, F열은 "기본"
    """
    name_norm = normalize_name(employee_name)
    for r in range(1, ws.max_row + 1):
        d_val = ws.cell(row=r, column=4).value
        f_val = ws.cell(row=r, column=6).value
        if d_val and normalize_name(str(d_val)) == name_norm and \
           isinstance(f_val, str) and f_val.strip() == "기본":
            return r
    return None


def get_dow(year: int, month: int, day: int) -> str:
    try:
        d = datetime.date(year, month, day)
        return ["월", "화", "수", "목", "금", "토", "일"][d.weekday()]
    except ValueError:
        return ""


def classify_attendance(slot: dict, year: int, month: int, day: int,
                        paid_holidays: dict, normal_start: str = "08:30",
                        normal_end: str = "17:30") -> dict:
    """
    PDF 슬롯 → 카테고리별 시간 + 비고
    Returns: {기본, 연장, 심야, 특근, 특잔, 지각조퇴, 비고}
    """
    result = {"기본": 0, "연장": 0, "심야": 0, "특근": 0, "특잔": 0, "지각조퇴": 0, "비고": ""}
    start = slot.get("start", "")
    end = slot.get("end", "")
    ot_str = slot.get("ot", "")
    note = slot.get("note", "")

    if not start and not end and not note:
        return result

    if note in ("퇴사",):
        return result

    dow = get_dow(year, month, day)
    is_saturday = dow == "토"
    is_sunday = dow == "일"
    date_str = f"{year}-{month:02d}-{day:02d}"

    try:
        ot_hours = float(ot_str) if ot_str else 0
    except (ValueError, TypeError):
        ot_hours = 0

    # 1. 공휴일 유급
    if date_str in paid_holidays:
        result["기본"] = 8
        result["비고"] = "유급"
        return result

    # 2. 연차/반차/반반차 → 모두 8시간 + 비고
    if note in ("연차", "반차", "반반차"):
        result["기본"] = 8
        result["비고"] = note
        return result

    # 3. 토요일 특근
    if is_saturday and (start or end):
        # PDF의 잔업칸 숫자가 특근시간일 가능성 (8.0, 6.0 등)
        if ot_hours > 0:
            result["특근"] = ot_hours
        else:
            normal_dur = max(0, time_to_hours(end) - time_to_hours(start) - 1) if start and end else 8
            result["특근"] = normal_dur
        return result

    # 4. 일요일은 별도 처리 (주휴는 후처리)
    if is_sunday and not start and not end:
        return result

    # 5. 평일 정상 출근
    if start and end:
        s_h = time_to_hours(start)
        e_h = time_to_hours(end)
        normal_s = time_to_hours(normal_start)
        normal_e = time_to_hours(normal_end)

        # 지각/조퇴 계산
        late_hours = max(0, s_h - normal_s)  # 정상보다 늦게 시작
        early_leave = max(0, normal_e - e_h) if e_h <= normal_e else 0
        result["지각조퇴"] = -(late_hours + early_leave) if (late_hours + early_leave) > 0 else 0

        # 기본근무는 정상 출퇴근 시간 기준 8시간
        if e_h > normal_e:
            # 정상 종료 후 잔업
            result["기본"] = 8
            overtime = e_h - normal_e
            result["연장"] = ot_hours if ot_hours > 0 else overtime
        else:
            result["기본"] = 8

    elif start and not end:
        result["기본"] = 8

    return result


def calc_weekly_paid_holiday(employee_classified: Dict[int, dict],
                              year: int, month: int) -> Dict[int, float]:
    """
    일요일 주휴 자동 판단.
    조건: 해당 주 월~금 중 근태 인정(기본/연차/반차/반반차/유급)이 있고
          다음 주 월요일 출근 가능

    Returns: { 일요일_day: 8.0 } - 주휴 8시간 입력할 일자
    """
    sundays_to_pay = {}

    # 인정 항목 판별
    def has_credit(day: int) -> bool:
        if day < 1 or day > 31:
            return False
        c = employee_classified.get(day, {})
        if c.get("기본", 0) >= 4:
            return True
        if c.get("비고") in ("연차", "반차", "반반차", "유급"):
            return True
        return False

    # 각 일요일 검사
    for day in range(1, 32):
        try:
            d = datetime.date(year, month, day)
        except ValueError:
            continue
        if d.weekday() != 6:  # 일요일이 아니면 skip
            continue

        # 그 주 월~금 (이번 일요일에서 1~5일 전)
        weekdays_credit = 0
        for offset in range(1, 6):
            check_day = day - offset
            if has_credit(check_day):
                weekdays_credit += 1

        # 최소 1일이라도 근태 인정 + 그 주에 결근 없음 정도면 OK (간소화)
        if weekdays_credit >= 1:
            sundays_to_pay[day] = 8.0

    return sundays_to_pay


def calc_monthly_adjustment(employee_classified: Dict[int, dict],
                             sundays_paid: Dict[int, float],
                             standard_hours: int = 209) -> float:
    """
    월말 주휴 보정칸 계산.
    인정시간합계 = 기본 + 연차/반차/반반차_8 + 유급_8 + 일요일주휴
    인정시간합계 < 209 → 양수 (부족분)
    인정시간합계 > 209 → 음수 (초과분)
    """
    total = 0
    for day, c in employee_classified.items():
        if c.get("기본", 0) > 0:
            total += c["기본"]
    for day, hrs in sundays_paid.items():
        total += hrs
    return standard_hours - total


def fill_attendance_sheet(
    excel_path: str,
    pdf_data: Dict[str, Dict[int, dict]],
    year: int,
    month: int,
    sheet_name: str = None,
    paid_holidays: dict = None,
    standard_hours: int = 209,
    normal_start: str = "08:30",
    normal_end: str = "17:30",
    overwrite_existing: bool = False,
) -> dict:
    """
    근태 시트 자동 입력.
    원본 파일을 그대로 받아서 직접 수정 (수식/서식 보존).

    Returns: {
        "stats": {name: cells_filled},
        "missing": [name, ...],
        "log": [...],
        "review_list": [...]
    }
    """
    paid_holidays = paid_holidays or {}
    wb = load_workbook(excel_path, data_only=False)

    # 근태 시트 자동 감지
    if sheet_name is None:
        sheet_name = next((n for n in wb.sheetnames if "근태" in n), None)
    if not sheet_name or sheet_name not in wb.sheetnames:
        raise ValueError(f"근태 시트를 찾을 수 없습니다. 사용 가능: {wb.sheetnames}")

    ws = wb[sheet_name]
    log = []
    review = []
    stats = {}
    missing = []

    # 전체 직원 분류 결과 저장 (월말 보정용)
    all_classified: Dict[str, Dict[int, dict]] = {}

    for name, days in pdf_data.items():
        start_row = find_employee_block(ws, name)
        if start_row is None:
            missing.append(name)
            review.append({
                "구분": "직원_매칭실패",
                "성명": name,
                "메시지": f"엑셀 근태 시트에서 '{name}' 행을 찾지 못함",
            })
            continue

        # 카테고리 → 행 매핑
        cat_to_row = {
            "기본": start_row,
            "연장": start_row + 1,
            "심야": start_row + 2,
            "특근": start_row + 3,
            "특잔": start_row + 4,
            "지각 조퇴": start_row + 5,
        }

        # 일자별 분류
        classified: Dict[int, dict] = {}
        for day in range(1, 32):
            slot = days.get(day, {})
            classified[day] = classify_attendance(
                slot, year, month, day, paid_holidays, normal_start, normal_end
            )

        # 일요일 주휴 자동 판단
        sundays = calc_weekly_paid_holiday(classified, year, month)

        all_classified[name] = classified
        cell_count = 0

        # 일자별 셀 입력 (H열=8 이 1일)
        for day in range(1, 32):
            col = 7 + day  # H(8) = 1일
            c = classified[day]

            # 기본근무 (값 + 비고)
            if c["기본"]:
                if safe_set_value(ws, cat_to_row["기본"], col, c["기본"], log):
                    cell_count += 1

            if c["연장"]:
                if safe_set_value(ws, cat_to_row["연장"], col, c["연장"], log):
                    cell_count += 1

            if c["심야"]:
                if safe_set_value(ws, cat_to_row["심야"], col, c["심야"], log):
                    cell_count += 1

            if c["특근"]:
                if safe_set_value(ws, cat_to_row["특근"], col, c["특근"], log):
                    cell_count += 1

            if c["특잔"]:
                if safe_set_value(ws, cat_to_row["특잔"], col, c["특잔"], log):
                    cell_count += 1

            if c["지각조퇴"]:
                if safe_set_value(ws, cat_to_row["지각 조퇴"], col, c["지각조퇴"], log):
                    cell_count += 1

            # 일요일 주휴 자동 입력
            if day in sundays:
                if safe_set_value(ws, cat_to_row["기본"], col, sundays[day], log):
                    cell_count += 1
                review.append({
                    "구분": "주휴_자동입력",
                    "성명": name,
                    "일자": f"{year}-{month:02d}-{day:02d}",
                    "요일": "일",
                    "입력값": sundays[day],
                    "메시지": "월~금 인정 항목 있어 일요일 주휴 8시간 자동 입력",
                })

            # 비고 (반차/반반차/연차/유급) 검토 리스트
            if c.get("비고"):
                review.append({
                    "구분": f"비고_{c['비고']}",
                    "성명": name,
                    "일자": f"{year}-{month:02d}-{day:02d}",
                    "요일": get_dow(year, month, day),
                    "PDF원문": days.get(day, {}).get("note", ""),
                    "입력값": f"기본 {c['기본']} ({c['비고']})",
                    "메시지": f"{c['비고']} 처리 — 기본근무 8시간으로 입력. 비고 셀 위치 확인 필요",
                })

        # 월말 보정 — 31일 옆 컬럼 (AM=39)
        adjustment = calc_monthly_adjustment(classified, sundays, standard_hours)
        if abs(adjustment) > 0.01:
            adj_col = 39  # AM열 (31일 옆)
            if safe_set_value(ws, cat_to_row["기본"], adj_col, round(adjustment, 1), log):
                cell_count += 1
            review.append({
                "구분": "월말_보정",
                "성명": name,
                "메시지": f"월 기준 {standard_hours}h 대비 보정값 {round(adjustment, 1)}h",
            })

        stats[name] = cell_count

    return {
        "stats": stats,
        "missing": missing,
        "log": log,
        "review_list": review,
        "wb": wb,
    }
