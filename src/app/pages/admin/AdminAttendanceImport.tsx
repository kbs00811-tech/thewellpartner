/**
 * 출근부 업로드 (PDF → 근태)
 *
 * 단일 책임:
 *   PDF 출근부를 받아서 근태 시트가 채워진 새 엑셀 파일을 다운로드
 *
 * 흐름:
 *   1. PDF 출근부 + 청구 엑셀 업로드 (드래그앤드롭)
 *   2. PDF 자동 파싱 (텍스트 PDF)
 *   3. 청구 엑셀의 "근태 ( N월 )" 시트에 자동 입력
 *   4. 새 파일로 다운로드 (원본 보존)
 */
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import { handleError, handleSuccess } from "../../lib/error-handler";

const TIME_RE = /^\d{1,2}:\d{2}$/;
const NUM_RE = /^\d+(\.\d+)?$/;
const SPECIAL_NOTES = ["연차", "반차", "반반", "퇴사", "(연차)", "(반차)", "(반반)"];
const KOREAN_RE = /^[가-힣]{1,4}$/;

interface AttendanceSlot {
  start: string;
  end: string;
  ot: string;
  note: string;
}
type EmployeeAttendance = Record<string, Record<number, AttendanceSlot>>;

// PDF 파싱 (브라우저용 pdfjs-dist 사용)
async function parsePDF(file: File): Promise<EmployeeAttendance> {
  const pdfjsLib: any = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false, useWorker: false }).promise;

  const result: EmployeeAttendance = {};

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: any[] = content.items;

    // y 좌표로 행 그룹화
    const rows: { y: number; tokens: { x: number; xEnd: number; text: string }[] }[] = [];
    for (const it of items) {
      const text = (it.str || "").trim();
      if (!text) continue;
      const x = it.transform[4];
      const xEnd = x + (it.width || 0);
      const y = Math.round(it.transform[5]);
      const existing = rows.find((r) => Math.abs(r.y - y) < 3);
      if (existing) existing.tokens.push({ x, xEnd, text });
      else rows.push({ y, tokens: [{ x, xEnd, text }] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) row.tokens.sort((a, b) => a.x - b.x);

    // 직원명 행 찾기
    const nameTokens: { name: string; xCenter: number }[] = [];
    for (const row of rows.slice(0, 8)) {
      const found: { name: string; xCenter: number }[] = [];
      let i = 0;
      while (i < row.tokens.length) {
        // 두 토큰 결합 시도 ("이 미란")
        if (i + 1 < row.tokens.length) {
          const combined = (row.tokens[i].text + row.tokens[i + 1].text).replace(/\s/g, "");
          if (KOREAN_RE.test(combined) && combined.length >= 2) {
            found.push({ name: combined, xCenter: (row.tokens[i].x + row.tokens[i + 1].xEnd) / 2 });
            i += 2;
            continue;
          }
        }
        const single = row.tokens[i].text.replace(/\s/g, "");
        if (KOREAN_RE.test(single) && single.length >= 2) {
          found.push({ name: single, xCenter: (row.tokens[i].x + row.tokens[i].xEnd) / 2 });
        }
        i++;
      }
      if (found.length >= 2) {
        nameTokens.push(...found);
        break;
      }
    }

    if (nameTokens.length === 0) continue;
    for (const { name } of nameTokens) {
      if (!result[name]) {
        result[name] = {};
        for (let d = 1; d <= 31; d++) result[name][d] = { start: "", end: "", ot: "", note: "" };
      }
    }

    // 컬럼 폭 추정
    const colWidth = nameTokens.length >= 2 ? Math.abs(nameTokens[1].xCenter - nameTokens[0].xCenter) : 100;

    // 일자 행 처리
    for (const row of rows) {
      if (!row.tokens.length) continue;
      const firstText = row.tokens[0].text.trim();
      const day = parseInt(firstText);
      if (isNaN(day) || day < 1 || day > 31) continue;

      // 데이터 토큰 (요일 제외)
      const dataTokens = row.tokens.slice(1).filter((t) => !["일", "월", "화", "수", "목", "금", "토"].includes(t.text));

      for (const { name, xCenter } of nameTokens) {
        const half = colWidth / 2;
        const inRange = dataTokens.filter((t) => {
          const tCenter = (t.x + t.xEnd) / 2;
          return tCenter >= xCenter - half && tCenter < xCenter + half;
        });
        if (!inRange.length) continue;
        inRange.sort((a, b) => a.x - b.x);

        const slot = result[name][day];
        for (const tok of inRange) {
          const text = tok.text.trim();
          if (SPECIAL_NOTES.includes(text)) {
            slot.note = text.replace(/[()]/g, "");
          } else if (TIME_RE.test(text)) {
            if (!slot.start) slot.start = text;
            else if (!slot.end) slot.end = text;
          } else if (NUM_RE.test(text)) {
            slot.ot = text;
          }
        }
      }
    }
  }

  return result;
}

function getDow(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
}

function classifyAttendance(slot: AttendanceSlot, year: number, month: number, day: number) {
  const result = { 기본: 0, 연장: 0, 심야: 0, 특근: 0, 특잔: 0, 지각조퇴: 0 };
  const { start, end, ot, note } = slot;
  if (!start && !end && !note) return result;
  if (note === "연차" || note === "퇴사") return result;
  const isWeekend = ["토", "일"].includes(getDow(year, month, day));
  const otNum = parseFloat(ot) || 0;

  if (isWeekend) {
    if (end === "17:30") result.특근 = 8;
    else if (end === "15:30") result.특근 = 6;
    else if (end === "12:30") result.특근 = 4;
    else if (start) result.특근 = 8;
    if (otNum) result.특잔 = otNum;
  } else {
    if (note === "반차") result.기본 = 4;
    else if (note === "반반") result.기본 = 6;
    else if (start === "13:30") result.기본 = 4;
    else if (start === "10:30") result.기본 = 6;
    else if (end === "12:30") result.기본 = 4;
    else if (end === "15:30") result.기본 = 6;
    else if (start) result.기본 = 8;
    if (otNum) result.연장 = otNum;
  }
  return result;
}

// 엑셀 입력 (xlsx 라이브러리 사용)
async function fillExcel(excelFile: File, pdfData: EmployeeAttendance, year: number, month: number): Promise<{ blob: Blob; stats: Record<string, number>; missing: string[] }> {
  const buffer = await excelFile.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellStyles: true, cellDates: false });

  // 근태 시트 찾기
  const sheetName = wb.SheetNames.find((n) => /근태/.test(n));
  if (!sheetName) throw new Error("'근태' 시트를 찾을 수 없습니다.");
  const sheet = wb.Sheets[sheetName];

  // 헬퍼: cell 주소 → 값 가져오기
  const getCell = (r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
    return sheet[addr]?.v;
  };

  // 직원 행 찾기 (A열 "{이름}기본" 또는 D열 이름)
  const findEmployeeRow = (name: string): number | null => {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
    for (let r = 1; r <= range.e.r + 1; r++) {
      const v = getCell(r, 1);
      if (typeof v === "string" && v.replace(/\s/g, "") === `${name}기본`) return r;
    }
    for (let r = 1; r <= range.e.r + 1; r++) {
      const v = getCell(r, 4);
      if (typeof v === "string" && v.trim() === name) return r;
    }
    return null;
  };

  const stats: Record<string, number> = {};
  const missing: string[] = [];

  for (const [name, days] of Object.entries(pdfData)) {
    const startRow = findEmployeeRow(name);
    if (!startRow) { missing.push(name); continue; }
    const catRow: Record<string, number> = {
      기본: startRow, 연장: startRow + 1, 심야: startRow + 2,
      특근: startRow + 3, 특잔: startRow + 4, 지각조퇴: startRow + 5,
    };
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const slot = days[day];
      if (!slot) continue;
      const classified = classifyAttendance(slot, year, month, day);
      for (const [cat, val] of Object.entries(classified)) {
        if (!val) continue;
        const r = catRow[cat];
        if (!r) continue;
        const c = 6 + day;
        const addr = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
        sheet[addr] = { t: "n", v: val };
        count++;
      }
    }
    stats[name] = count;
  }

  // 범위 갱신
  const allKeys = Object.keys(sheet).filter((k) => !k.startsWith("!"));
  if (allKeys.length > 0) {
    const decoded = allKeys.map((k) => XLSX.utils.decode_cell(k));
    const maxR = Math.max(...decoded.map((d) => d.r));
    const maxC = Math.max(...decoded.map((d) => d.c));
    sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  return {
    blob: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    stats, missing
  };
}

export default function AdminAttendanceImport() {
  const pdfRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<EmployeeAttendance | null>(null);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfDrag, setPdfDrag] = useState(false);
  const [excelDrag, setExcelDrag] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // 파일명에서 년월 추출
  const extractYM = (name: string) => {
    const m1 = name.match(/(\d{2})\.(\d{2})\s*월/);
    if (m1) return { y: 2000 + parseInt(m1[1]), m: parseInt(m1[2]) };
    const m2 = name.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
    if (m2) return { y: parseInt(m2[1]), m: parseInt(m2[2]) };
    const m3 = name.match(/_(\d{1,2})\s*월/);
    if (m3) return { y: new Date().getFullYear(), m: parseInt(m3[1]) };
    return null;
  };

  const handlePdf = async (file: File) => {
    setPdfFile(file);
    setParsing(true);
    try {
      const ym = extractYM(file.name);
      if (ym) { setYear(ym.y); setMonth(ym.m); }
      const data = await parsePDF(file);
      const empCount = Object.keys(data).length;
      if (empCount === 0) {
        handleError(new Error("PDF에서 직원 데이터를 추출하지 못했습니다."));
        return;
      }
      setPdfData(data);
      handleSuccess(`PDF 파싱 완료: ${empCount}명 인식`);
    } catch (e: any) {
      handleError(e, { fallback: "PDF 처리 실패" });
    } finally { setParsing(false); }
  };

  const handleProcess = async () => {
    if (!pdfData || !excelFile) {
      handleError(new Error("PDF와 엑셀 파일을 모두 업로드해주세요."));
      return;
    }
    setGenerating(true);
    try {
      const { blob, stats, missing } = await fillExcel(excelFile, pdfData, year, month);
      const fileName = excelFile.name.replace(/\.xlsx$/i, "_근태자동입력완료.xlsx");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      const inputCount = Object.keys(stats).length;
      const totalCells = Object.values(stats).reduce((s, v) => s + v, 0);
      handleSuccess(`${inputCount}명 / ${totalCells}개 셀 입력 완료${missing.length ? ` (매칭 실패: ${missing.length}명)` : ""}`);
    } catch (e: any) {
      handleError(e, { fallback: "엑셀 처리 실패" });
    } finally { setGenerating(false); }
  };

  const onPdfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setPdfDrag(false);
    const f = e.dataTransfer.files?.[0]; if (f) handlePdf(f);
  }, []);
  const onExcelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setExcelDrag(false);
    const f = e.dataTransfer.files?.[0]; if (f) setExcelFile(f);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-navy)]">① 출근부 업로드 (PDF → 근태)</h1>
        <p className="text-sm text-gray-500 mt-1">본사 PDF 출근부를 업로드하면 청구 엑셀의 근태 시트에 자동으로 입력됩니다. 원본 엑셀은 절대 변경되지 않고 새 파일로 다운로드됩니다.</p>
      </div>

      {/* 단계 표시 */}
      <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto">
        {[
          { num: 1, label: "PDF 업로드", done: !!pdfFile },
          { num: 2, label: "엑셀 업로드", done: !!excelFile },
          { num: 3, label: "다운로드", done: false },
        ].map((s, i, arr) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              s.done ? "bg-green-50 text-green-600" : i === [pdfFile, excelFile, false].findIndex((x) => !x) ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                s.done ? "bg-green-500 text-white" : i === [pdfFile, excelFile, false].findIndex((x) => !x) ? "bg-blue-500 text-white" : "bg-gray-300 text-white"
              }`}>{s.done ? "✓" : s.num}</div>
              {s.label}
            </div>
            {i < arr.length - 1 && <ArrowRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* PDF 업로드 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setPdfDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setPdfDrag(false); }}
          onDrop={onPdfDrop}
          onClick={() => pdfRef.current?.click()}
          className={`bg-white rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all ${
            pdfDrag ? "border-red-400 bg-red-50" : pdfFile ? "border-green-300 bg-green-50/30" : "border-gray-200 hover:border-red-200"
          }`}
        >
          <FileText size={36} className={`mx-auto mb-2 ${pdfFile ? "text-green-500" : "text-red-400"}`} />
          <h3 className="font-bold text-[var(--brand-navy)] mb-1">① PDF 출근부</h3>
          {pdfFile ? (
            <div className="text-xs text-gray-600 mt-2">
              <CheckCircle2 size={14} className="inline mr-1 text-green-500" />
              {pdfFile.name}
              <div className="mt-2 text-green-600 font-semibold">
                {parsing ? "파싱중..." : pdfData ? `${Object.keys(pdfData).length}명 인식` : ""}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">PDF를 끌어놓거나 클릭</p>
          )}
          <input ref={pdfRef} type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdf(f); }} className="hidden" />
        </div>

        {/* 엑셀 업로드 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setExcelDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setExcelDrag(false); }}
          onDrop={onExcelDrop}
          onClick={() => excelRef.current?.click()}
          className={`bg-white rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all ${
            excelDrag ? "border-green-400 bg-green-50" : excelFile ? "border-green-300 bg-green-50/30" : "border-gray-200 hover:border-green-200"
          }`}
        >
          <FileSpreadsheet size={36} className={`mx-auto mb-2 ${excelFile ? "text-green-500" : "text-green-600"}`} />
          <h3 className="font-bold text-[var(--brand-navy)] mb-1">② 청구 엑셀</h3>
          {excelFile ? (
            <div className="text-xs text-gray-600 mt-2">
              <CheckCircle2 size={14} className="inline mr-1 text-green-500" />
              {excelFile.name}
            </div>
          ) : (
            <p className="text-xs text-gray-500">엑셀(.xlsx)을 끌어놓거나 클릭</p>
          )}
          <input ref={excelRef} type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) setExcelFile(f); }} className="hidden" />
        </div>
      </div>

      {/* 연/월 */}
      {(pdfFile || excelFile) && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[var(--brand-navy)]">대상 연월:</span>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          <span>년</span>
          <input type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          <span>월</span>
          <span className="text-xs text-gray-500 ml-auto">파일명에서 자동 인식 (수동 수정 가능)</span>
        </div>
      )}

      {/* 실행 버튼 */}
      <button
        onClick={handleProcess}
        disabled={!pdfData || !excelFile || generating}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[var(--brand-blue)] text-white font-semibold text-base disabled:opacity-50 min-h-[52px]"
      >
        {generating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
        근태 자동 입력 + 다운로드
      </button>

      {/* PDF 결과 미리보기 */}
      {pdfData && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-[var(--brand-navy)] text-sm">PDF 인식 결과 ({Object.keys(pdfData).length}명)</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(pdfData).map((name) => {
              const days = pdfData[name];
              const filled = Object.values(days).filter((d) => d.start || d.end || d.note).length;
              return (
                <div key={name} className="px-3 py-1.5 rounded-lg bg-gray-50 text-xs">
                  <span className="font-semibold text-[var(--brand-navy)]">{name}</span>
                  <span className="text-gray-500 ml-2">{filled}일</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="mt-6 bg-amber-50 rounded-xl p-4 text-xs text-amber-700">
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>이 기능은 출근부 자동 입력 전용입니다.</strong> 청구내역 입력은 <strong>"② 청구내역 업로드"</strong> 메뉴에서, 명세서 발송은 <strong>"③ 명세서 발송"</strong> 메뉴에서 진행하세요.
          </div>
        </div>
      </div>
    </div>
  );
}
