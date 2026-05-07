"""
입력 누락 검증 — PDF 원문 vs 엑셀 입력 결과 비교

검증 대상:
  - PDF에 정상 출근(8:30 17:30)인데 엑셀 기본=8 누락
  - PDF에 잔업 시간 있는데 엑셀 연장 누락
  - PDF에 연차/반차/반반 있는데 엑셀 표기 누락
  - PDF에 토요일 근무 있는데 엑셀 연장 누락
  - 단, 입사일 이전 날짜는 검증 X
"""
from __future__ import annotations
import datetime
from typing import Dict, List, Optional


def verify_input_completeness(
    ws,
    pdf_data: Dict[str, Dict[int, dict]],
    employee_blocks: Dict[str, Dict[str, int]],
    hire_dates: Dict[str, datetime.date],
    paid_holidays: Dict[str, str],
    year: int,
    month: int,
    day_to_col: Dict[int, int],
) -> List[dict]:
    """
    각 직원별로 PDF 데이터와 엑셀 입력 결과를 비교, 누락된 항목 반환.

    Returns: [{ "구분", "성명", "일자", "요일", "PDF원문", "입력값", "메시지" }, ...]
    """
    missing_list: List[dict] = []

    def cell_val(row: int, col: int):
        if not row or row < 1:
            return None
        v = ws.cell(row=row, column=col).value
        return v

    def is_blank(v):
        return v is None or v == ""

    def is_truthy_num(v):
        return isinstance(v, (int, float)) and v != 0

    for name, days in pdf_data.items():
        block = employee_blocks.get(name)
        if not block:
            continue
        hd = hire_dates.get(name)
        basic_row = block.get("기본")
        ot_row = block.get("연장")
        if not basic_row:
            continue

        for day in range(1, 32):
            try:
                target_date = datetime.date(year, month, day)
            except ValueError:
                continue

            # 입사일 이전은 검증 안 함
            if hd and target_date < hd:
                continue

            slot = days.get(day, {})
            note = slot.get("note", "")
            start = slot.get("start", "")
            end = slot.get("end", "")
            ot_str = slot.get("ot", "")
            try:
                ot_hours = float(ot_str) if ot_str else 0
            except (ValueError, TypeError):
                ot_hours = 0

            # PDF에 데이터 없으면 검증할 것 없음
            has_data = bool(start or end or ot_str or note in ("연차", "반차", "반반차"))
            if not has_data:
                continue

            col = day_to_col.get(day)
            if not col:
                continue

            dow_idx = target_date.weekday()
            dow = ["월", "화", "수", "목", "금", "토", "일"][dow_idx]
            is_weekend = dow_idx in (5, 6)
            date_str = f"{year}-{month:02d}-{day:02d}"

            basic_val = cell_val(basic_row, col)
            ot_val = cell_val(ot_row, col) if ot_row else None

            # 케이스 1: 연차/반차/반반차
            if note in ("연차", "반차", "반반차"):
                if basic_val not in (8, 8.0):
                    missing_list.append({
                        "구분": "입력누락_기본",
                        "성명": name,
                        "일자": date_str,
                        "요일": dow,
                        "PDF원문": f"{note}",
                        "입력값": str(basic_val),
                        "메시지": f"{note} 인정 → 기본=8 기대, 실제={basic_val}",
                    })
                if ot_val != note:
                    missing_list.append({
                        "구분": "입력누락_표기",
                        "성명": name,
                        "일자": date_str,
                        "요일": dow,
                        "PDF원문": f"{note}",
                        "입력값": str(ot_val),
                        "메시지": f"{note} 인정 → 연장행='{note}' 기대, 실제='{ot_val}'",
                    })
                continue

            # 케이스 2: 토/일 근무 (특근/주말 근무 → 연장 행)
            if is_weekend and (start or end or ot_hours > 0):
                # 연장 행에 시간 숫자 기대
                if not (isinstance(ot_val, (int, float)) and ot_val > 0):
                    # 단 일요일에 자동 주휴가 들어간 경우는 OK (PDF에 시간이 있어도 주휴 우선X 정책이 있으나,
                    # PDF 시간 발견 시 fill에서 sundays_filtered로 제외하고 연장에 입력)
                    # 만약 연장 행이 "주휴" 같은 텍스트면 별도 케이스
                    if isinstance(ot_val, str) and ot_val.strip() == "주휴":
                        # 일요일 자동 주휴와 PDF 시간 충돌 — 별도 검토
                        missing_list.append({
                            "구분": "입력충돌_주말근무vs주휴",
                            "성명": name,
                            "일자": date_str,
                            "요일": dow,
                            "PDF원문": f"{start} {end} {ot_str}",
                            "입력값": str(ot_val),
                            "메시지": "주말 근무 PDF인데 연장 행에 '주휴' — 검토 필요",
                        })
                    else:
                        missing_list.append({
                            "구분": "입력누락_주말연장",
                            "성명": name,
                            "일자": date_str,
                            "요일": dow,
                            "PDF원문": f"{start} {end} {ot_str}",
                            "입력값": str(ot_val),
                            "메시지": "주말 근무 → 연장 행에 시간 기대, 실제 누락",
                        })
                continue

            # 케이스 3: 평일 공휴일 (자동 유급)
            if date_str in paid_holidays and not is_weekend:
                if basic_val not in (8, 8.0):
                    missing_list.append({
                        "구분": "입력누락_공휴일기본",
                        "성명": name,
                        "일자": date_str,
                        "요일": dow,
                        "PDF원문": "",
                        "입력값": str(basic_val),
                        "메시지": f"평일 공휴일 → 기본=8 기대, 실제={basic_val}",
                    })
                if ot_val != "유급":
                    missing_list.append({
                        "구분": "입력누락_유급표기",
                        "성명": name,
                        "일자": date_str,
                        "요일": dow,
                        "PDF원문": "",
                        "입력값": str(ot_val),
                        "메시지": f"평일 공휴일 → 연장행='유급' 기대, 실제='{ot_val}'",
                    })
                continue

            # 케이스 4: 평일 정상 근무 (start + end 있음)
            if start and end:
                if basic_val not in (8, 8.0):
                    missing_list.append({
                        "구분": "입력누락_평일기본",
                        "성명": name,
                        "일자": date_str,
                        "요일": dow,
                        "PDF원문": f"{start} {end} {ot_str}",
                        "입력값": str(basic_val),
                        "메시지": f"평일 정상 근무 → 기본=8 기대, 실제={basic_val}",
                    })
                if ot_hours > 0:
                    if not (isinstance(ot_val, (int, float)) and ot_val > 0):
                        missing_list.append({
                            "구분": "입력누락_평일연장",
                            "성명": name,
                            "일자": date_str,
                            "요일": dow,
                            "PDF원문": f"{start} {end} {ot_str}",
                            "입력값": str(ot_val),
                            "메시지": f"평일 잔업 {ot_hours}h → 연장 행에 숫자 기대, 실제={ot_val}",
                        })

    return missing_list
