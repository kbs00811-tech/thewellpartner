"""
PDF 출근부 파싱

핵심 알고리즘:
  1. 엑셀 직원명 목록(expected_names)을 ground truth로 사용
  2. PDF 토큰을 normalize 후 expected_names를 순서대로 greedy 매칭
  3. 날짜 시퀀스 흐름 분석으로 "1 목 → 12 목" 같은 깨짐 자동 보정
"""
from __future__ import annotations
import re
from typing import Dict, List, Tuple, Optional
import pdfplumber

TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")
NUM_RE = re.compile(r"^-?\d+(?:\.\d+)?$")
KOREAN_RE = re.compile(r"^[가-힣]+$")
DOW_TOKENS = {"일", "월", "화", "수", "목", "금", "토"}
SPECIAL_NOTES = ["연차", "반차", "반반", "반반차", "퇴사", "주휴", "유급",
                  "(연차)", "(반차)", "(반반)", "(반반차)", "결근"]


def normalize_name(name: str) -> str:
    return str(name or "").replace(" ", "").strip()


def normalize_note(text: str) -> str:
    t = text.replace("(", "").replace(")", "").strip()
    if t == "반반":
        return "반반차"
    return t


def time_to_hours(time_str: str) -> float:
    if not time_str or not TIME_RE.match(time_str):
        return 0.0
    h, m = time_str.split(":")
    return int(h) + int(m) / 60


def diff_hours(start: str, end: str) -> float:
    s = time_to_hours(start)
    e = time_to_hours(end)
    if s == 0 or e == 0:
        return 0
    return max(0, e - s - 1)


def _match_expected_names_in_tokens(
    tokens: List[dict],
    expected_names: List[str],
) -> List[Tuple[str, float]]:
    """
    페이지 상단 토큰에서 expected_names를 순서대로 greedy 매칭.

    알고리즘:
      1. 한글 토큰만 추출, 정규화하여 한 줄 문자열 생성
      2. 각 토큰의 (시작 인덱스, 끝 인덱스, x_center) 기록
      3. expected_names를 순서대로 normalize 후 문자열 내 검색
      4. 매칭된 위치에 해당하는 토큰들의 x_center 평균 계산

    Returns: [(name, x_center), ...]
    """
    if not expected_names:
        return []

    # 1. 한글 토큰만 추출
    han_tokens = [t for t in tokens if KOREAN_RE.match(t["text"].replace(" ", ""))]
    han_tokens.sort(key=lambda t: t["x0"])

    if not han_tokens:
        return []

    # 2. 토큰별 정규화 텍스트와 인덱스 추적
    parts: List[str] = []
    token_ranges: List[Tuple[int, int, dict]] = []  # (start_idx, end_idx, token)
    cursor = 0
    for tok in han_tokens:
        text = tok["text"].replace(" ", "")
        if not text:
            continue
        parts.append(text)
        token_ranges.append((cursor, cursor + len(text), tok))
        cursor += len(text)
    full_str = "".join(parts)

    # 3. expected_names 순서대로 매칭
    matched: List[Tuple[str, float]] = []
    search_from = 0
    for name in expected_names:
        norm_name = normalize_name(name)
        if not norm_name:
            continue
        idx = full_str.find(norm_name, search_from)
        if idx < 0:
            continue
        idx_end = idx + len(norm_name)
        # 4. 매칭 범위에 해당하는 토큰들의 x_center 수집
        x_starts: List[float] = []
        x_ends: List[float] = []
        for (ts, te, tok) in token_ranges:
            # 매칭 범위와 토큰 범위 교집합
            if ts < idx_end and te > idx:
                x_starts.append(tok["x0"])
                x_ends.append(tok["x1"])
        if x_starts and x_ends:
            x_center = (min(x_starts) + max(x_ends)) / 2
            matched.append((name, x_center))
            search_from = idx_end
    return matched


def _correct_day_sequence(raw_days: List[Optional[int]]) -> Tuple[List[Optional[int]], List[dict]]:
    """
    일자 시퀀스 흐름 분석 후 깨진 값 보정.

    규칙:
      - 월초 1일은 그대로 유지
      - prev=11, raw=1, next=13 → raw=12로 보정 (PDF에서 12가 1로 깨짐)
      - 일반화: raw <= prev 이고 next == prev + 2 → raw = prev + 1

    Returns: (corrected_days, corrections_log)
    """
    corrected = list(raw_days)
    log: List[dict] = []
    n = len(corrected)
    prev_real = None
    for i, d in enumerate(corrected):
        if d is None:
            continue
        # 첫 1일은 무조건 유지
        if prev_real is None:
            prev_real = d
            continue
        # 다음 유효 day 찾기
        next_d = None
        for j in range(i + 1, min(n, i + 4)):
            if corrected[j] is not None:
                next_d = corrected[j]
                break
        # 보정 조건: 현재가 이전보다 작거나 같고, 다음이 이전+2 → 깨짐
        if d <= prev_real and next_d is not None and next_d == prev_real + 2:
            new_d = prev_real + 1
            log.append({
                "kind": "날짜_보정",
                "index": i,
                "raw": d,
                "corrected": new_d,
                "context": f"prev={prev_real}, raw={d}, next={next_d}",
            })
            corrected[i] = new_d
            prev_real = new_d
        else:
            prev_real = d
    return corrected, log


def parse_pdf(
    pdf_path: str,
    expected_names: Optional[List[str]] = None,
) -> Tuple[Dict[str, Dict[int, dict]], dict]:
    """
    PDF 출근부 파싱.

    Args:
      pdf_path: PDF 파일 경로
      expected_names: 엑셀에서 추출한 직원명 목록 (있으면 ground truth로 사용)

    Returns:
      (employee_data, meta)
      - employee_data: {name: {day: {start, end, ot, note}}}
      - meta: {year, month, total_employees, raw_pages, day_corrections, parse_warnings}
    """
    result: Dict[str, Dict[int, dict]] = {}
    meta = {
        "year": None,
        "month": None,
        "total_employees": 0,
        "raw_pages": 0,
        "day_corrections": [],
        "parse_warnings": [],
        "matched_employees": [],
    }

    with pdfplumber.open(pdf_path) as pdf:
        meta["raw_pages"] = len(pdf.pages)

        for page_idx, page in enumerate(pdf.pages):
            words = page.extract_words(
                x_tolerance=1.5,
                y_tolerance=2.5,
                keep_blank_chars=False,
                use_text_flow=False,
            )
            if not words:
                continue

            words.sort(key=lambda w: (w["top"], w["x0"]))

            # 행 단위 그룹핑
            rows: List[Tuple[float, List[dict]]] = []
            current_row: List[dict] = []
            last_top = None
            for w in words:
                if last_top is None or abs(w["top"] - last_top) <= 3:
                    current_row.append(w)
                    if last_top is None:
                        last_top = w["top"]
                else:
                    rows.append((last_top, sorted(current_row, key=lambda x: x["x0"])))
                    current_row = [w]
                    last_top = w["top"]
            if current_row:
                rows.append((last_top, sorted(current_row, key=lambda x: x["x0"])))

            # 연도/월 메타 추출
            if not meta["year"]:
                full_text = page.extract_text() or ""
                m = re.search(r"(\d{4})\.\d{2}", full_text) or re.search(r"(\d{2})\.(\d{1,2})", full_text)
                if m:
                    yr_str = m.group(1)
                    meta["year"] = int(yr_str) if len(yr_str) == 4 else 2000 + int(yr_str)
                m2 = re.search(r"(\d{1,2})\s*월\s*출근부", full_text)
                if m2:
                    meta["month"] = int(m2.group(1))

            # === 직원명 파싱 ===
            employee_names: List[str] = []
            employee_x_centers: List[float] = []

            # 1순위: expected_names로 ground truth 매칭
            if expected_names:
                # 페이지 상단 첫 8행의 모든 토큰 모아서 매칭
                top_tokens: List[dict] = []
                for top, row in rows[:8]:
                    top_tokens.extend(row)
                matched = _match_expected_names_in_tokens(top_tokens, expected_names)
                if len(matched) >= 1:
                    employee_names = [n for n, _ in matched]
                    employee_x_centers = [x for _, x in matched]
                    meta["matched_employees"].extend(employee_names)

            # 2순위: 폴백 — 기존 알고리즘 (2~4글자 한글 그룹핑)
            if not employee_names:
                for top, row in rows[:8]:
                    names_in_row: List[Tuple[str, float]] = []
                    i = 0
                    tokens = row
                    while i < len(tokens):
                        if i + 1 < len(tokens):
                            combined = (tokens[i]["text"] + tokens[i + 1]["text"]).replace(" ", "")
                            if KOREAN_RE.match(combined) and 2 <= len(combined) <= 4:
                                x_center = (tokens[i]["x0"] + tokens[i + 1]["x1"]) / 2
                                names_in_row.append((combined, x_center))
                                i += 2
                                continue
                        single = tokens[i]["text"].replace(" ", "")
                        if KOREAN_RE.match(single) and 2 <= len(single) <= 4:
                            x_center = (tokens[i]["x0"] + tokens[i]["x1"]) / 2
                            names_in_row.append((single, x_center))
                        i += 1

                    if len(names_in_row) >= 2:
                        employee_names = [n for n, _ in names_in_row]
                        employee_x_centers = [x for _, x in names_in_row]
                        break

            if not employee_names:
                meta["parse_warnings"].append({
                    "page": page_idx + 1,
                    "msg": "직원명 추출 실패",
                })
                continue

            for name in employee_names:
                if name not in result:
                    result[name] = {d: {"start": "", "end": "", "ot": "", "note": ""} for d in range(1, 32)}

            if len(employee_x_centers) >= 2:
                col_width = abs(employee_x_centers[1] - employee_x_centers[0])
            else:
                col_width = 100

            # === 일자 행 추출 (보정 전 raw) ===
            day_rows: List[Tuple[Optional[int], List[dict]]] = []  # (raw_day, data_tokens)
            for top, row in rows:
                if not row:
                    continue
                first_text = row[0]["text"].strip()
                try:
                    day = int(first_text)
                except ValueError:
                    continue
                # 일자는 1~31 범위. 단 PDF 깨짐으로 12→1처럼 작아질 수 있음
                if day < 1 or day > 31:
                    continue
                data_tokens = [w for w in row[1:] if w["text"].strip() not in DOW_TOKENS]
                day_rows.append((day, data_tokens))

            # === 일자 시퀀스 보정 ===
            raw_days = [d for d, _ in day_rows]
            corrected_days, corrections = _correct_day_sequence(raw_days)
            for c in corrections:
                meta["day_corrections"].append({
                    "page": page_idx + 1,
                    **c,
                })

            # === 일자별 데이터 입력 ===
            for idx, (corrected_day, (_, data_tokens)) in enumerate(zip(corrected_days, day_rows)):
                if corrected_day is None or corrected_day < 1 or corrected_day > 31:
                    continue
                day = corrected_day

                for name, emp_x in zip(employee_names, employee_x_centers):
                    half = col_width / 2
                    in_range = [
                        t for t in data_tokens
                        if emp_x - half <= (t["x0"] + t["x1"]) / 2 < emp_x + half
                    ]
                    if not in_range:
                        continue
                    in_range.sort(key=lambda t: t["x0"])

                    slot = result[name][day]
                    for tok in in_range:
                        text = tok["text"].strip()
                        if text in SPECIAL_NOTES:
                            slot["note"] = normalize_note(text)
                        elif TIME_RE.match(text):
                            if not slot["start"]:
                                slot["start"] = text
                            elif not slot["end"]:
                                slot["end"] = text
                        elif NUM_RE.match(text):
                            slot["ot"] = text

    meta["total_employees"] = len(result)
    # 매칭된 직원 dedup
    meta["matched_employees"] = list(dict.fromkeys(meta["matched_employees"]))
    return result, meta
