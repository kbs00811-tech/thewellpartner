"""
PDF 출근부 파싱
"""
import re
from typing import Dict, List, Tuple
import pdfplumber

TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")
NUM_RE = re.compile(r"^-?\d+(?:\.\d+)?$")
KOREAN_RE = re.compile(r"^[가-힣]{2,4}$")
DOW_TOKENS = {"일", "월", "화", "수", "목", "금", "토"}
SPECIAL_NOTES = ["연차", "반차", "반반", "반반차", "퇴사", "주휴", "유급",
                  "(연차)", "(반차)", "(반반)", "(반반차)"]


def normalize_name(name: str) -> str:
    return str(name or "").replace(" ", "").strip()


def normalize_note(text: str) -> str:
    t = text.replace("(", "").replace(")", "").strip()
    if t == "반반":
        return "반반차"
    return t


def parse_pdf(pdf_path: str) -> Tuple[Dict[str, Dict[int, dict]], dict]:
    result: Dict[str, Dict[int, dict]] = {}
    meta = {"year": None, "month": None, "total_employees": 0, "raw_pages": 0}

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

            if not meta["year"]:
                full_text = page.extract_text() or ""
                m = re.search(r"(\d{4})\.\d{2}", full_text) or re.search(r"(\d{2})\.(\d{1,2})", full_text)
                if m:
                    yr_str = m.group(1)
                    meta["year"] = int(yr_str) if len(yr_str) == 4 else 2000 + int(yr_str)
                m2 = re.search(r"(\d{1,2})\s*월\s*출근부", full_text)
                if m2:
                    meta["month"] = int(m2.group(1))

            employee_names: List[str] = []
            employee_x_centers: List[float] = []

            for top, row in rows[:8]:
                names_in_row: List[Tuple[str, float]] = []
                i = 0
                tokens = row
                while i < len(tokens):
                    if i + 1 < len(tokens):
                        combined = (tokens[i]["text"] + tokens[i + 1]["text"]).replace(" ", "")
                        if KOREAN_RE.match(combined):
                            x_center = (tokens[i]["x0"] + tokens[i + 1]["x1"]) / 2
                            names_in_row.append((combined, x_center))
                            i += 2
                            continue
                    single = tokens[i]["text"].replace(" ", "")
                    if KOREAN_RE.match(single):
                        x_center = (tokens[i]["x0"] + tokens[i]["x1"]) / 2
                        names_in_row.append((single, x_center))
                    i += 1

                if len(names_in_row) >= 2:
                    employee_names = [n for n, _ in names_in_row]
                    employee_x_centers = [x for _, x in names_in_row]
                    break

            if not employee_names:
                continue

            for name in employee_names:
                if name not in result:
                    result[name] = {d: {"start": "", "end": "", "ot": "", "note": ""} for d in range(1, 32)}

            if len(employee_x_centers) >= 2:
                col_width = abs(employee_x_centers[1] - employee_x_centers[0])
            else:
                col_width = 100

            for top, row in rows:
                if not row:
                    continue
                first_text = row[0]["text"].strip()
                try:
                    day = int(first_text)
                except ValueError:
                    continue
                if day < 1 or day > 31:
                    continue

                data_tokens = [w for w in row[1:] if w["text"].strip() not in DOW_TOKENS]

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
    return result, meta


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
