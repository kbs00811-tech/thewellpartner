"""
근태 시트 자동 입력 (수식/서식 보존)

원칙:
  1. 원본 파일은 shutil.copyfile로 복사
  2. load_workbook(..., data_only=False) 사용
  3. 수식 셀 절대 덮어쓰지 않음
  4. 병합셀 좌상단만 입력
  5. 입력은 H~AL열 (1일~31일)만
  6. 직원 블록의 행 구성은 양식에 따라 자동 탐지
"""
from __future__ import annotations
import datetime
import re
from typing import Dict, List, Optional
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell
from openpyxl.utils import get_column_letter

from .attendance_parser import normalize_name, time_to_hours
from .holidays import merge_holidays

# 직원 블록의 행 라벨 — F열에서 검색
BASIC_LABELS = {"기본", "기본근무", "정상"}
OT_LABELS = {"연장", "잔업"}
NIGHT_LABELS = {"심야", "야간"}
SAT_LABELS = {"특근", "토특근"}
SAT_OT_LABELS = {"특잔", "특근잔업"}
LATE_LABELS = {"지각 조퇴", "지각조퇴", "지각/조퇴"}
WEEKLY_PAID_LABELS = {"주휴", "주휴수당"}
NOTE_LABELS = {"비고", "구분", "사유"}


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


def find_target_sheet(wb, month: int, user_sheet_name: Optional[str]) -> str:
    """
    대상 근태 시트 자동 감지.
    우선순위:
      1. 사용자 지정 sheet_name 정확히 매칭
      2. '근태 ( 3월 )', '근태(3월)', '3월 근태' 등 month 포함 패턴
      3. '근태' 들어가는 첫 시트
    """
    sheets = wb.sheetnames

    if user_sheet_name and user_sheet_name in sheets:
        return user_sheet_name

    # 패턴 1: 근태 ( 3월 ), 근태(3월), 근태 3월
    patterns = [
        rf"근태\s*\(\s*{month}\s*월\s*\)",
        rf"근태\s*{month}\s*월",
        rf"{month}\s*월\s*근태",
    ]
    for ws_name in sheets:
        for p in patterns:
            if re.search(p, ws_name):
                return ws_name

    # 패턴 2: '근태' 포함 첫 시트
    for ws_name in sheets:
        if "근태" in ws_name:
            return ws_name

    raise ValueError(f"대상 근태 시트를 찾을 수 없습니다 (대상 월: {month}). 사용 가능: {sheets}")


def find_employee_block(ws, employee_name: str) -> Optional[Dict[str, int]]:
    """
    근태 시트에서 직원 블록의 모든 행 위치를 탐지.
    F열 라벨 기준으로 기본/연장/심야/특근/특잔/지각조퇴/주휴/비고 행 매핑.

    Returns: {"start_row": int, "기본": int, "연장": int, ..., "주휴": int|None, "비고": int|None}
    """
    name_norm = normalize_name(employee_name)
    for r in range(1, ws.max_row + 1):
        d_val = ws.cell(row=r, column=4).value
        f_val = ws.cell(row=r, column=6).value
        if not (d_val and normalize_name(str(d_val)) == name_norm):
            continue
        if not (isinstance(f_val, str) and f_val.strip() in BASIC_LABELS):
            continue

        # 시작 행 발견 — 아래 행들의 F열 라벨을 스캔해서 카테고리 매핑
        block: Dict[str, Optional[int]] = {
            "start_row": r,
            "기본": r,
            "연장": None,
            "심야": None,
            "특근": None,
            "특잔": None,
            "지각조퇴": None,
            "주휴": None,
            "비고": None,
        }
        # 다음 직원 블록까지 또는 최대 12행 (충분한 여유)
        for offset in range(1, 13):
            row = r + offset
            label = ws.cell(row=row, column=6).value
            label_str = str(label).strip() if label else ""
            # 다음 직원 시작 (D열에 직원명 + F열 "기본")
            next_d = ws.cell(row=row, column=4).value
            if next_d and isinstance(next_d, str) and next_d.strip() and label_str in BASIC_LABELS:
                break
            if not label_str:
                continue
            if label_str in OT_LABELS:
                block["연장"] = row
            elif label_str in NIGHT_LABELS:
                block["심야"] = row
            elif label_str in SAT_LABELS:
                block["특근"] = row
            elif label_str in SAT_OT_LABELS:
                block["특잔"] = row
            elif label_str in LATE_LABELS:
                block["지각조퇴"] = row
            elif label_str in WEEKLY_PAID_LABELS:
                block["주휴"] = row
            elif label_str in NOTE_LABELS:
                block["비고"] = row
        return block
    return None


def get_dow(year: int, month: int, day: int) -> str:
    try:
        d = datetime.date(year, month, day)
        return ["월", "화", "수", "목", "금", "토", "일"][d.weekday()]
    except ValueError:
        return ""


def is_valid_day(year: int, month: int, day: int) -> bool:
    try:
        datetime.date(year, month, day)
        return True
    except ValueError:
        return False


def classify_attendance(slot: dict, year: int, month: int, day: int,
                        paid_holidays: dict, normal_start: str = "08:30",
                        normal_end: str = "17:30") -> dict:
    """
    PDF 슬롯 → 카테고리별 시간 + 비고
    Returns: {기본, 연장, 심야, 특근, 특잔, 지각조퇴, 비고, 인정시간}
    """
    result = {"기본": 0, "연장": 0, "심야": 0, "특근": 0, "특잔": 0,
              "지각조퇴": 0, "비고": "", "인정시간": 0}
    start = slot.get("start", "")
    end = slot.get("end", "")
    ot_str = slot.get("ot", "")
    note = slot.get("note", "")

    if not is_valid_day(year, month, day):
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

    # 1. 공휴일 유급 (3월 2일 같은 대체공휴일 포함)
    if date_str in paid_holidays:
        result["기본"] = 8
        result["비고"] = "유급"
        result["인정시간"] = 8
        return result

    # 2. 연차/반차/반반차 → 모두 8시간 + 비고
    if note in ("연차", "반차", "반반차"):
        result["기본"] = 8
        result["비고"] = note
        result["인정시간"] = 8
        return result

    # 3. 토요일 특근 — 기본 행에 입력 X (특근 행만 입력)
    if is_saturday and (start or end):
        if ot_hours > 0:
            result["특근"] = ot_hours
        elif start and end:
            normal_dur = max(0, time_to_hours(end) - time_to_hours(start) - 1)
            result["특근"] = normal_dur
        # 인정시간에 포함 X (사용자 요구: 특근/연장/심야/특잔 제외)
        return result

    # 4. 일요일은 기본적으로 빈칸 (주휴는 후처리)
    if is_sunday:
        return result

    # 5. 평일 데이터 없음 (결근/빈칸/정보없음)
    if not start and not end and not note:
        return result

    # 6. 평일 정상 출근
    if start and end:
        s_h = time_to_hours(start)
        e_h = time_to_hours(end)
        normal_s = time_to_hours(normal_start)
        normal_e = time_to_hours(normal_end)

        # 기본근무 8시간 (정상 출퇴근 기준 — 시간차 계산 없이 무조건 8)
        result["기본"] = 8
        result["인정시간"] = 8

        # 지각 — 정상보다 늦게 출근
        late_hours = max(0, s_h - normal_s)
        # 조퇴 — 정상보다 일찍 퇴근
        early_leave = max(0, normal_e - e_h) if e_h <= normal_e else 0
        if late_hours + early_leave > 0:
            result["지각조퇴"] = -(late_hours + early_leave)

        # 연장 — 정상 종료 후 잔업
        if e_h > normal_e:
            overtime = ot_hours if ot_hours > 0 else (e_h - normal_e)
            if overtime > 0:
                result["연장"] = overtime

        return result

    # 출근만 있고 퇴근 없음
    if start and not end:
        result["기본"] = 8
        result["인정시간"] = 8
        return result

    return result


def calc_weekly_paid_holiday(employee_classified: Dict[int, dict],
                              year: int, month: int) -> Dict[int, float]:
    """
    일요일 주휴 자동 판단 (강화된 조건).

    조건:
      1. 해당 주 월~금 5일 모두 근태 인정 (기본/연차/반차/반반차/유급)
      2. 다음 주 월요일이 근태 인정 (다음달 첫 주는 인정 X — 정보 없음으로 간주)
    """
    sundays_to_pay: Dict[int, float] = {}

    def has_credit(day: int) -> bool:
        if day < 1 or day > 31:
            return False
        if not is_valid_day(year, month, day):
            return False
        c = employee_classified.get(day, {})
        if c.get("기본", 0) >= 8:
            return True
        if c.get("비고") in ("연차", "반차", "반반차", "유급"):
            return True
        return False

    for day in range(1, 32):
        if not is_valid_day(year, month, day):
            continue
        d = datetime.date(year, month, day)
        if d.weekday() != 6:  # 일요일이 아니면 skip
            continue

        # 그 주 월~금 (이번 일요일 기준 1~5일 전)
        weekdays_credit = sum(1 for offset in range(1, 6) if has_credit(day - offset))

        # 다음 주 월요일 인정 — month 안에 있어야 검증 가능
        next_monday = day + 1
        next_monday_credit = has_credit(next_monday)
        # 다음 주 월요일이 다음달이면 보수적으로 OK (정보 없음 → 인정)
        next_monday_in_month = is_valid_day(year, month, next_monday)
        next_ok = next_monday_credit or (not next_monday_in_month)

        # 월~금 모두 인정 + 다음주 월요일 OK → 주휴 발생
        if weekdays_credit >= 5 and next_ok:
            sundays_to_pay[day] = 8.0

    return sundays_to_pay


def calc_monthly_adjustment(employee_classified: Dict[int, dict],
                             sundays_paid: Dict[int, float],
                             standard_hours: int = 209) -> float:
    """
    월말 주휴 보정 = 209 - 인정시간합계.
    인정시간 = 기본(정상/연차/반차/반반차/유급 전부 8시간) + 일요일주휴
    제외: 연장, 특근, 심야, 특잔
    """
    total = 0.0
    for day, c in employee_classified.items():
        # 인정시간 필드를 우선 사용 (classify_attendance에서 계산됨)
        rec = c.get("인정시간", 0) or c.get("기본", 0)
        total += rec
    for day, hrs in sundays_paid.items():
        total += hrs
    return standard_hours - total


def fill_attendance_sheet(
    excel_path: str,
    pdf_data: Dict[str, Dict[int, dict]],
    year: int,
    month: int,
    sheet_name: Optional[str] = None,
    paid_holidays: Optional[dict] = None,
    standard_hours: int = 209,
    normal_start: str = "08:30",
    normal_end: str = "17:30",
    overwrite_existing: bool = False,
) -> dict:
    """
    근태 시트 자동 입력. 원본 파일을 직접 수정 (수식/서식 보존).

    Returns: {
        "stats": {name: cells_filled},
        "missing": [name, ...],
        "log": [...],
        "review_list": [...],
        "wb": Workbook,
        "sheet_used": str,
        "year": int,
        "month": int,
        "merged_holidays": {date_str: name}
    }
    """
    user_holidays = paid_holidays or {}
    merged_holidays = merge_holidays(year, month, user_holidays)

    wb = load_workbook(excel_path, data_only=False)

    sheet_used = find_target_sheet(wb, month, sheet_name)
    ws = wb[sheet_used]

    log: List[dict] = []
    review: List[dict] = []
    stats: Dict[str, int] = {}
    missing: List[str] = []
    all_classified: Dict[str, Dict[int, dict]] = {}

    for name, days in pdf_data.items():
        block = find_employee_block(ws, name)
        if block is None:
            missing.append(name)
            review.append({
                "구분": "직원_매칭실패",
                "성명": name,
                "메시지": f"엑셀 '{sheet_used}' 시트에서 '{name}' 행을 찾지 못함",
            })
            continue

        classified: Dict[int, dict] = {}
        for day in range(1, 32):
            slot = days.get(day, {})
            classified[day] = classify_attendance(
                slot, year, month, day, merged_holidays, normal_start, normal_end
            )

        sundays = calc_weekly_paid_holiday(classified, year, month)
        all_classified[name] = classified
        cell_count = 0

        # 일자별 셀 입력 (H열=8 이 1일)
        for day in range(1, 32):
            if not is_valid_day(year, month, day):
                continue
            col = 7 + day  # H=8 → 1일
            c = classified[day]

            # 기본근무
            if c["기본"] and block["기본"]:
                if safe_set_value(ws, block["기본"], col, c["기본"], log):
                    cell_count += 1

            # 연장
            if c["연장"] and block["연장"]:
                if safe_set_value(ws, block["연장"], col, c["연장"], log):
                    cell_count += 1

            # 심야
            if c["심야"] and block["심야"]:
                if safe_set_value(ws, block["심야"], col, c["심야"], log):
                    cell_count += 1

            # 특근 (토요일)
            if c["특근"] and block["특근"]:
                if safe_set_value(ws, block["특근"], col, c["특근"], log):
                    cell_count += 1

            # 특잔
            if c["특잔"] and block["특잔"]:
                if safe_set_value(ws, block["특잔"], col, c["특잔"], log):
                    cell_count += 1

            # 지각/조퇴
            if c["지각조퇴"] and block["지각조퇴"]:
                if safe_set_value(ws, block["지각조퇴"], col, c["지각조퇴"], log):
                    cell_count += 1

            # 비고 (반차/반반차/연차/유급) — 양식에 비고 행이 있으면 입력
            if c.get("비고") and block.get("비고"):
                if safe_set_value(ws, block["비고"], col, c["비고"], log):
                    cell_count += 1
            elif c.get("비고"):
                # 비고 행이 없는 양식 — 검토리스트에 남김
                review.append({
                    "구분": f"비고_{c['비고']}",
                    "성명": name,
                    "일자": f"{year}-{month:02d}-{day:02d}",
                    "요일": get_dow(year, month, day),
                    "PDF원문": days.get(day, {}).get("note", ""),
                    "입력값": f"기본 {c['기본']} ({c['비고']})",
                    "메시지": f"{c['비고']} — 양식에 비고 행 없음. 수동 확인 필요",
                })

        # 일요일 주휴 — 별도 주휴 행 우선, 없으면 기본 행
        for sday, hrs in sundays.items():
            scol = 7 + sday
            target_row = block["주휴"] if block["주휴"] else block["기본"]
            if safe_set_value(ws, target_row, scol, hrs, log):
                cell_count += 1
            # 비고 칸에 "주휴" 표기
            if block.get("비고"):
                if safe_set_value(ws, block["비고"], scol, "주휴", log):
                    cell_count += 1
            review.append({
                "구분": "주휴_자동입력",
                "성명": name,
                "일자": f"{year}-{month:02d}-{sday:02d}",
                "요일": "일",
                "입력값": hrs,
                "메시지": "월~금 5일 모두 인정 + 다음주 월요일 인정 → 주휴 8h",
            })

        # 공휴일 유급 비고 표시 (3월 2일 등)
        for day in range(1, 32):
            if not is_valid_day(year, month, day):
                continue
            c = classified[day]
            if c.get("비고") == "유급":
                review.append({
                    "구분": "공휴일_유급",
                    "성명": name,
                    "일자": f"{year}-{month:02d}-{day:02d}",
                    "요일": get_dow(year, month, day),
                    "PDF원문": days.get(day, {}).get("note", ""),
                    "입력값": "기본 8 + 비고 '유급'",
                    "메시지": f"{merged_holidays.get(f'{year}-{month:02d}-{day:02d}', '공휴일')} 유급 처리",
                })

        # 월말 주휴 보정 — 31일 옆 컬럼 (AM=39)
        adjustment = calc_monthly_adjustment(classified, sundays, standard_hours)
        if abs(adjustment) > 0.01:
            adj_col = 39  # AM열 (31일 옆)
            target_row = block["주휴"] if block["주휴"] else block["기본"]
            adj_value = round(adjustment, 1)
            if safe_set_value(ws, target_row, adj_col, adj_value, log):
                cell_count += 1
            review.append({
                "구분": "월말_보정",
                "성명": name,
                "메시지": f"월 기준 {standard_hours}h 대비 인정시간 {standard_hours - adj_value}h → 보정값 {adj_value}h",
            })

        stats[name] = cell_count

    return {
        "stats": stats,
        "missing": missing,
        "log": log,
        "review_list": review,
        "wb": wb,
        "sheet_used": sheet_used,
        "year": year,
        "month": month,
        "merged_holidays": merged_holidays,
    }
