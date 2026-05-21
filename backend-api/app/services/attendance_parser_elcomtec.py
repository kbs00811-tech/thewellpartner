"""
엘컴텍 근태대장 PDF 파서 (x좌표 기반)

엘티와이와 PDF 포맷이 완전히 다름:
  - 근태관리시스템 출력 '근 태 대 장' (페이지=직원 1명)
  - 평일/휴일 컬럼이 빈칸이면 텍스트 추출 시 collapse → 고정 x좌표 매핑 필수
  - 파트별 PDF 여러 개(응원봉/영업) → 직원명으로 병합

반환: ({성명: {일(int): rec}}, meta)
  rec = {'구분': 평일/무휴/주휴, '출결': 정상근무/결근/지각/조퇴/...,
         '평_기본','평_연장','평_야간','휴_기본','휴_연장','휴_야간','지각','조퇴'}
"""
from __future__ import annotations
import re
import warnings
import logging
from typing import Optional

import pdfplumber

warnings.filterwarnings("ignore")
logging.getLogger("pdfminer").setLevel(logging.ERROR)


def _col_of(x: float) -> Optional[str]:
    """단어 x0 좌표 → 논리 컬럼명. 엘컴텍 근태대장 고정 레이아웃 기준."""
    # 실/인정 출퇴근 시각 (지각·조퇴 계산 기준 — 인정근무시간보다 우선)
    if 218 <= x <= 240: return "실출근"
    if 245 <= x <= 265: return "실퇴근"
    if 273 <= x <= 295: return "인정출근"
    if 298 <= x <= 318: return "인정퇴근"
    if 385 <= x <= 405: return "간"        # 인정근무시간
    if 415 <= x <= 432: return "평_조기"
    if 440 <= x <= 455: return "평_기본"
    if 462 <= x <= 482: return "평_연장"   # 이 회사 고정OT 미사용 → 연장값이 이 위치에 렌더
    if 520 <= x <= 540: return "평_야간"
    if 550 <= x <= 565: return "휴_기본"
    if 578 <= x <= 595: return "휴_수당"
    if 605 <= x <= 622: return "휴_연장"
    if 632 <= x <= 648: return "휴_야간"
    if 660 <= x <= 678: return "지각"
    if 688 <= x <= 705: return "조퇴"
    if 718 <= x <= 732: return "외출"
    if 744 <= x <= 758: return "휴게"
    return None


def _hm(s: str) -> Optional[float]:
    """'8:00'->8.0, '2:30'->2.5, '8'->8.0"""
    s = s.strip()
    if ":" in s:
        try:
            h, m = s.split(":")
            return int(h) + int(m) / 60.0
        except Exception:
            return None
    try:
        return float(s)
    except Exception:
        return None


_NUM_RE = re.compile(r"^\d+(\.\d+)?$")
_DAYROW_RE = re.compile(r"^(\d\d)/(\d\d)$")
_GUBUN = ("평일", "무휴", "주휴")
_CHULGYEOL = ("정상근무", "결근", "지각", "조퇴", "외출", "연차", "반차", "퇴사")


def _parse_page(page) -> tuple[Optional[str], dict]:
    words = page.extract_words()
    lines: dict = {}
    for w in words:
        lines.setdefault(round(w["top"] / 3), []).append(w)

    name: Optional[str] = None
    days: dict = {}
    for key in sorted(lines):
        ws_ = sorted(lines[key], key=lambda x: x["x0"])
        joined = " ".join(w["text"] for w in ws_)
        if name is None:
            m = re.search(r"사원\s*(\S+)", joined)
            if m:
                name = m.group(1)
        dm = _DAYROW_RE.match(ws_[0]["text"])
        if not dm:
            continue
        day = int(dm.group(2))
        rec: dict = {"구분": None, "출결": None}
        for w in ws_:
            x = w["x0"]
            t = w["text"]
            if 68 <= x <= 95 and t in _GUBUN:
                rec["구분"] = t
            elif 98 <= x <= 132 and t in _CHULGYEOL:
                rec["출결"] = t
            else:
                col = _col_of(x)
                if col and (":" in t or _NUM_RE.match(t)):
                    rec[col] = _hm(t)
        days[day] = rec
    return name, days


def parse_pdfs_elcomtec(pdf_paths: list[str]) -> tuple[dict, dict]:
    """여러 PDF를 파싱해 직원명으로 병합."""
    parsed: dict = {}
    pages_total = 0
    parts: list[str] = []
    for path in pdf_paths:
        with pdfplumber.open(path) as pdf:
            for p in pdf.pages:
                pages_total += 1
                name, days = _parse_page(p)
                if name:
                    if name in parsed:
                        parsed[name].update(days)  # 같은 직원 다른 파트 합산
                    else:
                        parsed[name] = days
        # 부서명 추출(메타용)
        try:
            with pdfplumber.open(path) as pdf:
                head = (pdf.pages[0].extract_text() or "").split("\n")
                dm = re.search(r"부서\s*(\S+)", head[1] if len(head) > 1 else "")
                if dm:
                    parts.append(dm.group(1))
        except Exception:
            pass

    # 연/월 추출
    year = month = None
    for path in pdf_paths:
        try:
            with pdfplumber.open(path) as pdf:
                txt = pdf.pages[0].extract_text() or ""
                ym = re.search(r"(\d{4})년\s*(\d{2})월", txt)
                if ym:
                    year, month = int(ym.group(1)), int(ym.group(2))
                    break
        except Exception:
            pass

    meta = {
        "year": year,
        "month": month,
        "total_employees": len(parsed),
        "raw_pages": pages_total,
        "parts": parts,
        "employees": list(parsed.keys()),
    }
    return parsed, meta
