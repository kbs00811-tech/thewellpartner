/**
 * PDF 출근부 파서
 * - 엘티와이 양식 + 일반화된 자동 인식
 * - 직원명, 입사일, 일자별 시간 자동 추출
 */

export interface ParsedAttendance {
  employees: Array<{
    name: string;
    hireDate?: string;
    hourlyRate?: number;
    gender?: string;
    days: Record<number, { start?: string; end?: string; overtime?: number; note?: string }>;
  }>;
  yearMonth?: string;
  clientName?: string;
}

// 시간 형식 검증: "8:30", "17:30", "20:00"
const TIME_RE = /^([0-9]{1,2}):([0-9]{2})$/;

// 날짜 형식: 2025.03.04, 2025-03-04
function parseDate(s: string): string | undefined {
  const m = s.match(/(\d{4})[\.\-](\d{1,2})[\.\-](\d{1,2})/);
  if (!m) return undefined;
  return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
}

/**
 * PDF.js로 PDF 텍스트를 추출하고 엘티와이 양식 출근부를 파싱
 */
export async function parsePDFAttendance(file: File): Promise<ParsedAttendance> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  // worker 비활성화
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "";

  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer, isEvalSupported: false, useWorker: false }).promise;
  const allEmployees: ParsedAttendance["employees"] = [];
  let yearMonth: string | undefined;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items: any[] = textContent.items;

    // x 좌표별 그룹 (컬럼) + y 좌표별 그룹 (행) 분석
    // 각 페이지: 5명 직원 (각 직원당 시작/종료/잔업 3컬럼)
    const lines: { y: number; tokens: { x: number; text: string }[] }[] = [];
    for (const it of items) {
      const text = (it.str || "").trim();
      if (!text) continue;
      const x = it.transform[4];
      const y = Math.round(it.transform[5]);
      // 같은 y에 묶기 (±2 오차)
      const existing = lines.find((l) => Math.abs(l.y - y) < 3);
      if (existing) existing.tokens.push({ x, text });
      else lines.push({ y, tokens: [{ x, text }] });
    }
    lines.sort((a, b) => b.y - a.y); // 위→아래

    // 라인별 토큰 정렬
    for (const line of lines) line.tokens.sort((a, b) => a.x - b.x);

    // === 직원명 추출 (페이지 상단) ===
    // 헤더 영역에서 "이 희영", "이 미란" 등 직원명 검색
    let employeeNames: string[] = [];
    let hireDates: (string | undefined)[] = [];
    const allText = lines.map((l) => l.tokens.map((t) => t.text).join(" ")).join("\n");

    // "3 월" 헤더 라인 근처 직원명 영역
    // 패턴: 한글 성 + 한글 이름 (공백 포함)
    const nameRe = /([가-힣])\s+([가-힣]{1,3})/g;
    const headerLines = lines.slice(0, 6).map((l) => l.tokens.map((t) => t.text).join(" ")).join(" ");
    let match;
    const seen = new Set<string>();
    while ((match = nameRe.exec(headerLines)) !== null) {
      const fullName = (match[1] + match[2]).trim();
      if (fullName.length >= 2 && fullName.length <= 4 && !seen.has(fullName)) {
        seen.add(fullName);
        employeeNames.push(fullName);
      }
    }

    // 입사일 라인 (날짜 5개)
    const dateMatches = headerLines.match(/\d{4}[\.\-]\d{1,2}[\.\-]\d{1,2}/g) || [];
    hireDates = dateMatches.map(parseDate);

    if (employeeNames.length === 0) continue;

    // 첫 페이지에서 연월 추출
    if (!yearMonth && hireDates.length > 0 && hireDates[0]) {
      const m = hireDates[0].match(/(\d{4})/);
      if (m) yearMonth = `${m[1]}-03`; // 3월 출근부 가정
    }

    // === 일자별 행 파싱 ===
    // 각 라인에서 첫 토큰이 숫자(1~31) → 일자, 그 다음 시간 데이터 5명분
    const employees = employeeNames.map((name, i) => ({
      name, hireDate: hireDates[i], days: {} as any,
    }));

    for (const line of lines) {
      const first = line.tokens[0];
      if (!first) continue;
      const day = parseInt(first.text);
      if (isNaN(day) || day < 1 || day > 31) continue;
      // 토큰 분석: [day, 요일, 5명분 데이터...]
      // 데이터 컬럼: 시작, 종료, 잔업 ×5
      const dataTokens = line.tokens.slice(2); // day, 요일 제외
      // 시간/숫자/특수값 추출
      let empIdx = 0;
      let colInEmp = 0; // 0=시작, 1=종료, 2=잔업
      const slot: any = { start: undefined, end: undefined, overtime: undefined, note: undefined };
      for (const tok of dataTokens) {
        const t = tok.text.trim();
        if (!t) continue;
        if (t === "연차" || t === "퇴사" || t === "반차" || t === "반반") {
          slot.note = t;
        } else if (TIME_RE.test(t)) {
          if (colInEmp === 0) slot.start = t;
          else if (colInEmp === 1) slot.end = t;
          colInEmp++;
        } else if (/^\d+(\.\d+)?$/.test(t)) {
          slot.overtime = parseFloat(t);
          colInEmp = 3; // 잔업까지 채워짐
        }
        // 다음 직원으로 넘어가는 휴리스틱: x 간격으로 추정 (단순화)
        if (colInEmp >= 3) {
          if (employees[empIdx]) {
            if (slot.start || slot.end || slot.note || slot.overtime) {
              employees[empIdx].days[day] = { ...slot };
            }
          }
          empIdx++;
          colInEmp = 0;
          slot.start = slot.end = slot.overtime = slot.note = undefined;
        }
      }
      // 마지막 직원 처리
      if (employees[empIdx] && (slot.start || slot.end || slot.note)) {
        employees[empIdx].days[day] = { ...slot };
      }
    }

    allEmployees.push(...employees);
  }

  return { employees: allEmployees, yearMonth };
}

/**
 * 시간 → 분류 (기본/연장/심야/특근/특잔)
 */
export function classifyHours(
  start: string | undefined,
  end: string | undefined,
  overtime: number | undefined,
  isWeekend: boolean,
  note: string | undefined
) {
  const result = { 기본: 0, 연장: 0, 심야: 0, 특근: 0, 특잔: 0, 지각: 0 };
  if (!start && !end && !note) return result;
  if (note === "연차" || note === "퇴사") return result;

  if (isWeekend) {
    if (end === "17:30") result.특근 = 8;
    else if (end === "15:30") result.특근 = 6;
    if (overtime) result.특잔 = overtime;
  } else {
    if (note === "반차") result.기본 = 4;
    else if (note === "반반") result.기본 = 6;
    else if (start === "13:30") result.기본 = 4;
    else if (start === "10:30") result.기본 = 6;
    else if (end === "12:30") result.기본 = 4;
    else if (end === "15:30") result.기본 = 6;
    else if (start) result.기본 = 8;
    if (overtime) result.연장 = overtime;
  }
  return result;
}
