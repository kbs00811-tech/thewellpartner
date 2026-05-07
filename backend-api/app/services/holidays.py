"""
한국 공휴일 자동 인식
- 양력 고정공휴일 (모든 연도 공통)
- 연도별 음력/대체공휴일 dict (2026년 등)
- 사용자 입력 공휴일과 병합
"""
from __future__ import annotations
from typing import Dict


# 매년 동일한 양력 공휴일
FIXED_HOLIDAYS: Dict[tuple, str] = {
    (1, 1): "신정",
    (3, 1): "삼일절",
    (5, 5): "어린이날",
    (6, 6): "현충일",
    (8, 15): "광복절",
    (10, 3): "개천절",
    (10, 9): "한글날",
    (12, 25): "성탄절",
}


# 2026년 공휴일 + 대체공휴일 (정부 발표 기준)
PAID_HOLIDAYS_2026: Dict[str, str] = {
    "2026-01-01": "신정",
    "2026-02-16": "설날",
    "2026-02-17": "설날",
    "2026-02-18": "설날",
    "2026-03-01": "삼일절",
    "2026-03-02": "삼일절(대체)",
    "2026-05-05": "어린이날",
    "2026-05-25": "부처님오신날(대체)",
    "2026-06-03": "지방선거",
    "2026-06-06": "현충일",
    "2026-06-08": "현충일(대체)",
    "2026-08-15": "광복절",
    "2026-08-17": "광복절(대체)",
    "2026-09-24": "추석",
    "2026-09-25": "추석",
    "2026-10-03": "개천절",
    "2026-10-05": "개천절(대체)",
    "2026-10-09": "한글날",
    "2026-12-25": "성탄절",
}


# 연도별 dict 매핑
YEARLY_HOLIDAYS: Dict[int, Dict[str, str]] = {
    2026: PAID_HOLIDAYS_2026,
}


def get_fixed_holidays_for_month(year: int, month: int) -> Dict[str, str]:
    """해당 월의 양력 고정공휴일 반환. 'YYYY-MM-DD' → 이름"""
    out: Dict[str, str] = {}
    for (m, d), name in FIXED_HOLIDAYS.items():
        if m == month:
            out[f"{year}-{month:02d}-{d:02d}"] = name
    return out


def get_yearly_holidays_for_month(year: int, month: int) -> Dict[str, str]:
    """연도별 dict에서 해당 월의 공휴일 추출 (대체공휴일 포함)"""
    yearly = YEARLY_HOLIDAYS.get(year, {})
    return {
        date_str: name
        for date_str, name in yearly.items()
        if date_str.startswith(f"{year}-{month:02d}-")
    }


def merge_holidays(year: int, month: int, user_holidays: Dict[str, str]) -> Dict[str, str]:
    """
    공휴일 병합 우선순위 (낮음 → 높음, 뒤에 덮어씀):
      1. 양력 고정공휴일 (가장 기본)
      2. 연도별 dict (대체공휴일 포함)
      3. 사용자 입력 (수동 추가/오버라이드)
    """
    merged = get_fixed_holidays_for_month(year, month)
    merged.update(get_yearly_holidays_for_month(year, month))
    merged.update(user_holidays or {})
    return merged
