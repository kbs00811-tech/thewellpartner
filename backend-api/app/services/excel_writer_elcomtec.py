"""
엘컴텍 근태 시트 자동 입력 + 연차/반차 자동판단

매핑 규칙 (직원당 6행: 기본/연장/심야/특근/특잔/지각조퇴):
  - 평일 근무(평_기본 있음): 기본=8, 연장+=평_연장, 심야+=평_야간
      · 인정근무시간(간)<8 → 지각조퇴 = 간 - 8 (점심차감은 PDF 인정근무시간이 이미 반영)
      · 지각/조퇴 & 간<8 → 반차 후보(검토만, 자동확정 X)
  - 평일 결근: 연차 자동판단(5조건) 충족 시 기본=8/연장='연차' + 연차내역 4월 사용 +1
      · 조건: ①평일결근 ②입사일 이후 ③퇴사일 이전 ④잔여 연차>0 ⑤적용 후 잔여≥0
      · 미충족이면 미인정 결근(주휴 제외) — 검토리스트에 기록
  - 토요일(무휴): 연장=휴_기본, 특잔+=휴_연장
  - 일요일 근무(주휴): 특근=휴_기본, 특잔+=휴_연장
  - 주휴 개근룰: 일요일 직전 월~금 '미인정 결근' 0이면 기본=8, 연장='주휴'
      · 연차 처리한 결근 = 근태 인정 → 주휴 포함 / 연차 아닌 결근 = 제외

검토 시트 '연차_반차_후보검토' 자동 생성.
수식·서식 100% 보존.
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

LEAVE_SHEET = "연차내역"
DB_SHEET = "DB"
REVIEW_SHEET = "연차_반차_후보검토"
MAX_BANCHA_PER_MONTH = 2


def _to_date(v) -> Optional[datetime.date]:
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    return None


def _read_db_dates(path: str) -> dict:
    """DB 시트 → {정규화명: {'hire': date|None, 'resign': date|None}}"""
    out: dict = {}
    try:
        wb = load_workbook(path, data_only=True, read_only=True)
    except Exception:
        return out
    try:
        if DB_SHEET not in wb.sheetnames:
            return out
        ws = wb[DB_SHEET]
        for row in ws.iter_rows(min_row=2, values_only=True):
            name = row[1] if len(row) > 1 else None  # B=성명
            if not name or not isinstance(name, str):
                continue
            hire = _to_date(row[4]) if len(row) > 4 else None   # E=입사일
            resign = _to_date(row[5]) if len(row) > 5 else None  # F=퇴사일
            out[normalize_name(name)] = {"hire": hire, "resign": resign}
    finally:
        wb.close()
    return out


def _read_leave_ledger(path: str) -> dict:
    """연차내역 시트 → {정규화명: {'used_row': int, 'available': float, 'remaining': float}}

    available = 발생합계 - (사용합계 - 현재4월사용)  → 4월에 사용 가능한 총량(기존 4월분 포함).
    used_row 의 L열(4월)에 누적 기입한다.
    """
    out: dict = {}
    try:
        wb = load_workbook(path, data_only=True, read_only=True)
    except Exception:
        return out
    try:
        if LEAVE_SHEET not in wb.sheetnames:
            return out
        ws = wb[LEAVE_SHEET]
        T, L, C, D = 20, 12, 3, 4  # 합계/4월/성명/일자 열
        max_row = ws.max_row
        for r in range(1, max_row + 1):
            if ws.cell(row=r, column=5).value != "발생":  # E열 '발생' = 블록 기준
                continue
            name = ws.cell(row=r, column=C).value
            if not name or not isinstance(name, str):
                continue
            def num(v):
                try:
                    return float(v) if v is not None else 0.0
                except Exception:
                    return 0.0
            발생합계 = num(ws.cell(row=r, column=T).value)
            사용합계 = num(ws.cell(row=r + 1, column=T).value)
            april_cur = num(ws.cell(row=r + 1, column=L).value)
            available = 발생합계 - (사용합계 - april_cur)
            remaining = num(ws.cell(row=r + 2, column=T).value)
            out[normalize_name(name)] = {
                "used_row": r + 1,
                "april_col": L,
                "available": available,
                "remaining": remaining,
            }
    finally:
        wb.close()
    return out


def _is_unexcused_absent(rec: Optional[dict], day: int, annual_days: set) -> bool:
    """주휴 판정용: 월중 평일인데 기록없음 or 평일 결근 & 연차처리 안 됨 → 미인정"""
    if day in annual_days:
        return False  # 연차 = 근태 인정
    if rec is None:
        return True
    if rec.get("구분") == "평일" and not rec.get("평_기본"):
        return True
    return False


def _week_full_attendance(days: dict, sunday: datetime.date, month: int, annual_days: set) -> bool:
    """일요일 직전 월~금(5일) 개근 여부. 연차 처리한 결근은 인정."""
    monday = sunday - datetime.timedelta(days=6)
    for off in range(5):  # Mon..Fri
        wd = monday + datetime.timedelta(days=off)
        if wd.month != month:
            continue  # 전월은 개근 가정
        if _is_unexcused_absent(days.get(wd.day), wd.day, annual_days):
            return False
    return True


def fill_attendance_sheet_elcomtec(
    excel_path: str,
    parsed: dict,
    year: int,
    month: int,
    sheet_name: Optional[str] = None,
    name_to_row: Optional[dict] = None,
    leave_ledger: Optional[dict] = None,
    db_dates: Optional[dict] = None,
) -> dict:
    """엘컴텍 근태 시트 자동 입력 + 연차/반차 자동판단. excel_path in-place 수정, wb 반환.

    leave_ledger/db_dates: 미리 계산한 스냅샷 주입 가능(원본 캐시 기반). None 이면 excel_path 에서 직접 추출.
    (연차내역 합계/잔여는 수식이라 openpyxl 저장 후엔 캐시가 사라짐 → 원본에서 추출해 주입)
    """
    # 의사결정용 캐시 스냅샷 (연차내역/DB) — 원본 캐시 기반
    if leave_ledger is None:
        leave_ledger = _read_leave_ledger(excel_path)
    if db_dates is None:
        db_dates = _read_db_dates(excel_path)

    wb = load_workbook(excel_path, data_only=False, keep_links=False)
    sheet_used = find_target_sheet(wb, month, sheet_name)
    ws = wb[sheet_used]
    ws_leave = wb[LEAVE_SHEET] if LEAVE_SHEET in wb.sheetnames else None

    if name_to_row is None:
        name_to_row = build_name_to_row_map(excel_path, sheet_used)

    log: list = []
    review: list = []          # 자동입력_검토리스트(기존)
    candidate_rows: list = []  # 연차_반차_후보검토(신규)
    stats: dict = {}
    missing: list = []
    counters = {
        "직원_매칭실패": 0,
        "지각조퇴_입력": 0,
        "연차_자동적용": 0,
        "반차_후보": 0,
        "미인정결근": 0,
        "주휴_자동입력": 0,
        "토요일_연장입력": 0,
        "일요일_특근입력": 0,
        "주휴_충돌": 0,
    }

    def recognized_hours(rec: dict) -> Optional[float]:
        g = rec.get("간")
        if g is not None:
            return g
        base = rec.get("평_기본")
        if base is None:
            return None
        return base + (rec.get("평_연장") or 0) + (rec.get("평_야간") or 0)

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

        norm = normalize_name(name)
        filled = 0
        r_기본 = block["기본"]; r_연장 = block["연장"]; r_심야 = block["심야"]
        r_특근 = block["특근"]; r_특잔 = block["특잔"]; r_지각조퇴 = block["지각조퇴"]

        info = db_dates.get(norm, {})
        hire = info.get("hire"); resign = info.get("resign")
        led = leave_ledger.get(norm, {})
        available = led.get("available", 0.0)
        annual_assigned = 0   # 이번 실행에서 부여한 연차 일수
        bancha_count = 0
        annual_days: set = set()

        # ── 1차: 일자별 입력 + 연차/반차/지각조퇴 판단 ──
        for day in sorted(days):
            rec = days[day]
            col = DAY_TO_COL.get(day)
            if not col:
                continue
            gb = rec.get("구분"); ot = rec.get("출결")
            date_str = f"{year}-{month:02d}-{day:02d}"
            dow = get_dow(year, month, day)
            day_date = datetime.date(year, month, day)

            if gb == "평일":
                base = rec.get("평_기본")
                if base:  # 근무
                    if safe_set_value(ws, r_기본, col, 8, log):
                        filled += 1
                    if rec.get("평_연장") and safe_set_value(ws, r_연장, col, rec["평_연장"], log):
                        filled += 1
                    if rec.get("평_야간") and safe_set_value(ws, r_심야, col, rec["평_야간"], log):
                        filled += 1
                    # 지각/조퇴: 인정근무시간(간) < 8 → 지각조퇴 = 간 - 8
                    rh = recognized_hours(rec)
                    if rh is not None and rh < 8:
                        deduct = round(rh - 8, 2)
                        if safe_set_value(ws, r_지각조퇴, col, deduct, log):
                            filled += 1
                            counters["지각조퇴_입력"] += 1
                        # 반차 후보 (확정X) — 지각/조퇴 + 잔여 + 당월 ≤2건
                        is_late_early = (ot in ("지각", "조퇴")) or rh < 8
                        if is_late_early and available - annual_assigned > 0 and bancha_count < MAX_BANCHA_PER_MONTH:
                            bancha_count += 1
                            counters["반차_후보"] += 1
                            candidate_rows.append({
                                "직원명": name, "날짜": date_str, "PDF출결": ot or "지각/조퇴",
                                "인정근무시간": rh, "지각시간": rec.get("지각") or "", "조퇴시간": rec.get("조퇴") or "",
                                "평일주말": "평일", "입사일": str(hire or ""), "퇴사일": str(resign or ""),
                                "연차잔여": round(available - annual_assigned, 2),
                                "자동판단": "반차후보", "입력값": f"지각조퇴={deduct}(유지)",
                                "검토메시지": f"부족 {round(8-rh,2)}h. 반차 확정 시 연차내역 0.5 반영(현재 미반영)",
                            })
                else:  # 평일 결근 → 연차 자동판단
                    after_hire = (hire is None) or (day_date >= hire)
                    before_resign = (resign is None) or (day_date <= resign)
                    has_quota = (available - annual_assigned) >= 1
                    if after_hire and before_resign and has_quota:
                        # 연차 자동적용
                        if safe_set_value(ws, r_기본, col, 8, log):
                            filled += 1
                        ok = safe_set_value_with_protection(
                            ws, r_연장, col, "연차", log, review, name, date_str, "연차_충돌")
                        if ok:
                            filled += 1
                        annual_assigned += 1
                        annual_days.add(day)
                        counters["연차_자동적용"] += 1
                        candidate_rows.append({
                            "직원명": name, "날짜": date_str, "PDF출결": ot or "결근",
                            "인정근무시간": "", "지각시간": "", "조퇴시간": "",
                            "평일주말": "평일", "입사일": str(hire or ""), "퇴사일": str(resign or ""),
                            "연차잔여": round(available - annual_assigned, 2),
                            "자동판단": "연차", "입력값": "기본8/연장=연차",
                            "검토메시지": "평일 결근 + 잔여연차 충분 → 연차 자동적용(연차내역 4월 +1)",
                        })
                    else:
                        counters["미인정결근"] += 1
                        reason = []
                        if not after_hire: reason.append("입사전")
                        if not before_resign: reason.append("퇴사후")
                        if not has_quota: reason.append("잔여연차 없음")
                        candidate_rows.append({
                            "직원명": name, "날짜": date_str, "PDF출결": ot or "결근",
                            "인정근무시간": "", "지각시간": "", "조퇴시간": "",
                            "평일주말": "평일", "입사일": str(hire or ""), "퇴사일": str(resign or ""),
                            "연차잔여": round(available - annual_assigned, 2),
                            "자동판단": "미인정결근", "입력값": "(미입력)",
                            "검토메시지": f"연차 미적용({', '.join(reason) or '판단보류'}) → 주휴 제외. 휴무/연차 수동 검토",
                        })

            elif gb == "무휴":  # 토요일
                hb = rec.get("휴_기본")
                if hb:
                    if safe_set_value(ws, r_연장, col, hb, log):
                        filled += 1; counters["토요일_연장입력"] += 1
                    if rec.get("휴_연장") and safe_set_value(ws, r_특잔, col, rec["휴_연장"], log):
                        filled += 1

            elif gb == "주휴":  # 일요일 근무
                hb = rec.get("휴_기본")
                if hb:
                    if safe_set_value(ws, r_특근, col, hb, log):
                        filled += 1; counters["일요일_특근입력"] += 1
                    if rec.get("휴_연장") and safe_set_value(ws, r_특잔, col, rec["휴_연장"], log):
                        filled += 1

        # ── 2차: 주휴 개근(연차 인정 포함) ──
        for day in sorted(days):
            if days[day].get("구분") != "주휴":
                continue
            sunday = datetime.date(year, month, day)
            if not _week_full_attendance(days, sunday, month, annual_days):
                continue
            col = DAY_TO_COL.get(day)
            if not col:
                continue
            if safe_set_value(ws, r_기본, col, 8, log):
                filled += 1
            ok = safe_set_value_with_protection(
                ws, r_연장, col, "주휴", log, review, name, f"{year}-{month:02d}-{day:02d}", "주휴_충돌")
            if ok:
                filled += 1; counters["주휴_자동입력"] += 1
            else:
                counters["주휴_충돌"] += 1

        # ── 연차내역 4월 사용란 기입 ──
        if annual_assigned > 0 and ws_leave and led.get("used_row"):
            safe_set_value(ws_leave, led["used_row"], led["april_col"], annual_assigned, log)

        stats[name] = filled

    # ── 검토 시트 생성 ──
    if REVIEW_SHEET in wb.sheetnames:
        del wb[REVIEW_SHEET]
    ws_rev = wb.create_sheet(REVIEW_SHEET)
    headers = ["직원명", "날짜", "PDF출결", "인정근무시간", "지각시간", "조퇴시간",
               "평일/주말", "입사일", "퇴사일", "연차잔여", "자동판단", "입력값", "검토메시지"]
    ws_rev.append(headers)
    for c in candidate_rows:
        ws_rev.append([
            c["직원명"], c["날짜"], c["PDF출결"], c["인정근무시간"], c["지각시간"], c["조퇴시간"],
            c["평일주말"], c["입사일"], c["퇴사일"], c["연차잔여"], c["자동판단"], c["입력값"], c["검토메시지"],
        ])

    return {
        "wb": wb,
        "sheet_used": sheet_used,
        "stats": stats,
        "missing": missing,
        "review_list": review,
        "candidate_rows": candidate_rows,
        "log": log,
        "counters": counters,
    }
