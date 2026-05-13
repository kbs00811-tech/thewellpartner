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


def _extract_korean_only(text: str) -> str:
    """텍스트에서 한글 문자만 추출 (공백/숫자/특수문자/\\xa0 등 모두 무시)"""
    if not text:
        return ""
    return ''.join(c for c in text if '가' <= c <= '힣')


def _edit_distance_1(a: str, b: str) -> bool:
    """두 문자열의 편집거리가 정확히 1인지 빠르게 검사 (길이 같은 substitution만).
    한글 이름 매칭용 — 거래처 PDF 오타 (예: 배성연 ↔ 배성현) 자동 매칭.
    삽입/삭제는 지원 안 함 (오인식 위험 너무 큼).
    """
    if not a or not b or len(a) != len(b) or len(a) < 2:
        return False
    diff = sum(1 for x, y in zip(a, b) if x != y)
    return diff == 1


def _match_expected_names_in_tokens(
    tokens: List[dict],
    expected_names: List[str],
) -> List[Tuple[str, float]]:
    """
    토큰들에서 expected_names를 한글 whitelist 방식으로 강건하게 매칭.

    알고리즘:
      1. 모든 토큰에서 한글만 추출 (whitelist) — 공백/숫자/특수문자/non-breaking space 무시
      2. (top, x0) 2차원 정렬 — 두 줄 분산도 처리
      3. 긴 이름 우선, 독립 검색, used_ranges 추적
      4. x_center 좌→우 재정렬

    fcd6f8a 시점 버그:
      KOREAN_RE = ^[가-힣]+$ 로 토큰 통째로 검사 후 replace(" ") 만 처리.
      "박 설희" 같이 토큰이 분리되거나 \\xa0 같은 특수 공백 있으면 누락.
      → "인보영박, 설희" 같은 깨짐 발생.

    Returns: [(name, x_center), ...]
    """
    if not expected_names:
        return []

    # 1. 한글이 포함된 모든 토큰 추출 + 한글만 뽑기
    han_tokens = []
    for t in tokens:
        kor = _extract_korean_only(t.get("text", ""))
        if kor:
            han_tokens.append({
                "x0": t["x0"],
                "x1": t["x1"],
                "top": t.get("top", 0),
                "kor": kor,
            })

    if not han_tokens:
        return []

    # 2. (top, x0) 정렬 — 두 줄 분산 케이스 처리
    han_tokens.sort(key=lambda t: (round(t.get("top", 0)), t["x0"]))

    parts: List[str] = []
    token_ranges: List[Tuple[int, int, dict]] = []
    cursor = 0
    for tok in han_tokens:
        kor = tok["kor"]
        parts.append(kor)
        token_ranges.append((cursor, cursor + len(kor), tok))
        cursor += len(kor)
    full_str = "".join(parts)

    # 3. 긴 이름 우선 검색
    sorted_names = sorted(
        {n for n in expected_names if _extract_korean_only(n)},
        key=lambda n: -len(_extract_korean_only(n))
    )

    # 4. 각 이름을 독립적으로 검색, 사용된 범위 추적
    used_ranges: List[Tuple[int, int]] = []
    name_to_x_center: dict = {}

    for name in sorted_names:
        norm_name = _extract_korean_only(name)
        if not norm_name:
            continue

        # 모든 occurrence 검색
        start = 0
        while True:
            idx = full_str.find(norm_name, start)
            if idx < 0:
                break
            idx_end = idx + len(norm_name)
            # 이미 사용된 범위와 겹치면 다음 occurrence 시도
            overlaps = any(s < idx_end and e > idx for s, e in used_ranges)
            if not overlaps:
                used_ranges.append((idx, idx_end))
                # x_center 계산
                x_starts: List[float] = []
                x_ends: List[float] = []
                for (ts, te, tok) in token_ranges:
                    if ts < idx_end and te > idx:
                        x_starts.append(tok["x0"])
                        x_ends.append(tok["x1"])
                if x_starts and x_ends:
                    x_center = (min(x_starts) + max(x_ends)) / 2
                    name_to_x_center[name] = x_center
                break
            start = idx + 1

    # 4.5. fuzzy 보강 — 정확 매칭 실패한 expected_names 중,
    #      사용 안 된 토큰 영역에서 편집거리 1 이내 후보 검색.
    #      거래처 PDF 오타 자동 처리 (예: 배성연 ↔ 배성현)
    #      안전 가드: 양식 안 다른 직원과 충돌 없을 때만 (1:1 대응)
    unmatched = [n for n in sorted_names if n not in name_to_x_center]
    if unmatched:
        # 사용 안 된 한글 substring 후보 (token boundary 기준)
        # 한 토큰 단위로 fuzzy candidate 추출
        candidates = []  # (kor_str, idx_in_full, end_idx)
        for ts, te, tok in token_ranges:
            # 이미 사용된 범위와 겹치면 제외
            if any(s < te and e > ts for s, e in used_ranges):
                continue
            kor = tok["kor"]
            if 2 <= len(kor) <= 4:
                candidates.append((kor, ts, te, tok))
        # 인접 토큰 결합도 시도 (한글이 토큰 분할된 케이스: "배 성연")
        for i in range(len(candidates) - 1):
            a_kor, a_ts, a_te, a_tok = candidates[i]
            b_kor, b_ts, b_te, b_tok = candidates[i + 1]
            # 인접 토큰 (top 같고 x 가까움)
            if abs(a_tok.get("top", 0) - b_tok.get("top", 0)) <= 3:
                merged = a_kor + b_kor
                if 2 <= len(merged) <= 4:
                    candidates.append((merged, a_ts, b_te, a_tok))

        for name in unmatched:
            norm_name = _extract_korean_only(name)
            if not norm_name or len(norm_name) < 2:
                continue
            # 충돌 가드: 양식 안 다른 직원 이름과 편집거리 1 이내인 경우 자동 매칭 X
            conflict = any(
                _edit_distance_1(norm_name, _extract_korean_only(other))
                for other in sorted_names
                if other != name and _extract_korean_only(other)
            )
            if conflict:
                continue
            # 후보 중 편집거리 1 매칭
            for c_kor, c_ts, c_te, c_tok in candidates:
                if c_ts < 0 or any(s < c_te and e > c_ts for s, e in used_ranges):
                    continue
                if _edit_distance_1(norm_name, c_kor):
                    used_ranges.append((c_ts, c_te))
                    x_center = (c_tok["x0"] + c_tok["x1"]) / 2
                    name_to_x_center[name] = x_center
                    break

    # 5. x_center 기준 좌→우 정렬
    matched = sorted(name_to_x_center.items(), key=lambda p: p[1])
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
            page_text_full = page.extract_text() or ""

            # 1순위: expected_names로 ground truth 매칭 (페이지 전체 토큰)
            if expected_names:
                # rows[:8] 제한 → 페이지 전체 토큰 (직원명이 8행 밖에 있어도 매칭)
                all_tokens: List[dict] = []
                for top, row in rows:
                    all_tokens.extend(row)
                matched = _match_expected_names_in_tokens(all_tokens, expected_names)
                if len(matched) >= 1:
                    employee_names = [n for n, _ in matched]
                    employee_x_centers = [x for _, x in matched]
                    meta["matched_employees"].extend(employee_names)

                meta.setdefault("debug", []).append({
                    "page": page_idx + 1,
                    "expected_count": len(expected_names),
                    "matched_count": len(matched),
                    "matched_names": [n for n, _ in matched],
                })

            # 1.5순위: 엘티와이 양식 강제 폴백 ("N월 출근부" 헤더)
            # 페이지 인덱스 × 5 기반으로 expected_names 슬라이싱 → 5명 강제 배정
            LTY_RE = re.compile(r"\d+\s*월\s*출근부")
            is_lty = bool(LTY_RE.search(page_text_full))
            if (
                expected_names
                and is_lty
                and len(employee_names) < min(5, len(expected_names) - page_idx * 5)
            ):
                page_start = page_idx * 5
                page_end = min(page_start + 5, len(expected_names))
                if page_end > page_start:
                    form_employees = expected_names[page_start:page_end]
                    # 시간 토큰 클러스터링으로 좌표 추정
                    time_x_centers: List[float] = []
                    for top, row in rows:
                        if not row:
                            continue
                        first_text = row[0]["text"].strip()
                        try:
                            dval = int(first_text)
                            if not (1 <= dval <= 31):
                                continue
                        except ValueError:
                            continue
                        for t in row[1:]:
                            if TIME_RE.match(t.get("text", "").strip()):
                                time_x_centers.append((t["x0"] + t["x1"]) / 2)

                    n_emp = len(form_employees)
                    cluster_centers: List[float] = []
                    if time_x_centers and n_emp >= 2:
                        time_x_centers.sort()
                        gaps = [
                            (time_x_centers[i + 1] - time_x_centers[i], i)
                            for i in range(len(time_x_centers) - 1)
                        ]
                        gaps.sort(reverse=True)
                        boundaries = sorted(g[1] for g in gaps[: n_emp - 1])
                        clusters = []
                        prev = 0
                        for b in boundaries:
                            clusters.append(time_x_centers[prev: b + 1])
                            prev = b + 1
                        clusters.append(time_x_centers[prev:])
                        cluster_centers = [sum(c) / len(c) for c in clusters if c]
                    # 폴백 좌표 (사용자 명시값)
                    if len(cluster_centers) < n_emp:
                        cluster_centers = [128.4, 225.6, 322.7, 419.9, 517.2][:n_emp]

                    employee_names = list(form_employees)
                    employee_x_centers = cluster_centers[:n_emp]
                    for nm in form_employees:
                        if nm not in meta["matched_employees"]:
                            meta["matched_employees"].append(nm)
                    meta["debug"].append({
                        "page": page_idx + 1,
                        "fallback": "lty_form_strict",
                        "form_employees": form_employees,
                    })

            # 2순위: 그래도 안 되면 — 기존 폴백 (KOREAN_RE 그룹핑, 단 expected_names 없을 때만)
            if not employee_names and not expected_names:
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
