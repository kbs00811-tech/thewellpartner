"""
한국 공휴일 자동 인식
- 양력 고정공휴일
- 음력 환산 공휴일은 입력에 의존 (사용자가 holidays 텍스트로 보냄)
- 대체공휴일도 사용자 입력에 의존
"""
from __future__ import annotations
from typing import Dict


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


def get_fixed_holidays_for_month(year: int, month: int) -> Dict[str, str]:
    """해당 월의 양력 고정공휴일 반환. 'YYYY-MM-DD' → 이름"""
    out: Dict[str, str] = {}
    for (m, d), name in FIXED_HOLIDAYS.items():
        if m == month:
            out[f"{year}-{month:02d}-{d:02d}"] = name
    return out


def merge_holidays(year: int, month: int, user_holidays: Dict[str, str]) -> Dict[str, str]:
    """고정공휴일 + 사용자 입력공휴일 병합. 사용자 입력 우선."""
    merged = get_fixed_holidays_for_month(year, month)
    merged.update(user_holidays or {})
    return merged
