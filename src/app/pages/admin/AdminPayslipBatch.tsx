/**
 * 명세서 일괄 발행
 * - 엑셀 업로드 → 지급 시트 자동 인식
 * - 직원별 PayslipData 생성
 * - 단일/일괄 PDF, ZIP, 이메일 발송
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { Upload, FileSpreadsheet, Eye, Download, Mail, Loader2, CheckCircle2, FileText, Archive, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { renderPayslip, generatePDFFromHTML, downloadPDF } from "../../lib/documents/templates";
import type { PayslipData, CompanyInfo } from "../../lib/documents/types";

interface RawEmployee {
  no: number;
  name: string;
  gender: string;
  hireDate: string;
  resignDate: string;
  hourlyRate: number;
  workDays: number;
  workHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  holidayOvertimeHours: number;
  lateHours: number;
  basicPay: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  holidayOvertimePay: number;
  lateDeduction: number;
  mealAllowance: number;
  transportAllowance: number;
  annualLeavePay: number;
  extraPay: number;
  deduction: number;
  directSubtotal: number;
  // 4대보험 (근로자 부담)
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  // 추가 공제
  incomeTax: number;
  localTax: number;
  netPay: number;
  email?: string;
}

// 엑셀 시트 자동 인식 우선순위
function findPaymentSheet(workbook: XLSX.WorkBook): string | null {
  // 1순위: "지급" 키워드
  const sheets = workbook.SheetNames;
  const paySheet = sheets.find((s) => /지급|급여|payment|payroll/i.test(s));
  if (paySheet) return paySheet;
  // 2순위: "청구"가 아닌 다른 시트
  const billing = sheets.find((s) => /청구|billing|invoice/i.test(s));
  if (billing) return billing; // 청구 시트라도 데이터는 추출 가능
  // 3순위: 첫 번째 시트
  return sheets[0] || null;
}

// 엑셀 → RawEmployee[]
function parseExcelToEmployees(workbook: XLSX.WorkBook): { employees: RawEmployee[]; clientName: string; yearMonth: string } | null {
  const sheetName = findPaymentSheet(workbook);
  if (!sheetName) return null;
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let clientName = "";
  let yearMonth = "";

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const text = rows[i].join(" ");
    if (!yearMonth) {
      const m = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
      if (m) yearMonth = `${m[1]}-${String(m[2]).padStart(2, "0")}`;
    }
    if (!clientName) {
      const m = text.match(/사용사업자\s*[:：]?\s*([^\s]+\s*[^\s]*)/);
      if (m) clientName = m[1].trim();
    }
  }

  const excelDateToStr = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    const n = Number(v);
    if (isNaN(n) || n < 1) return "";
    const date = new Date(Math.round((n - 25569) * 86400 * 1000));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const employees: RawEmployee[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const no = Number(row[0]);
    if (!no || isNaN(no)) continue;
    const name = String(row[1] || "").trim();
    if (!name) continue;

    const hourlyRate = Number(row[5]) || 0;
    const basicPay = Number(row[13]) || 0;
    const overtimePay = Number(row[14]) || 0;
    const nightPay = Number(row[15]) || 0;
    const holidayPay = Number(row[16]) || 0;
    const holidayOvertimePay = Number(row[17]) || 0;
    const lateDeduction = Number(row[18]) || 0;
    const mealAllowance = Number(row[19]) || 0;
    const transportAllowance = Number(row[20]) || 0;
    const annualLeavePay = Number(row[21]) || 0;
    const extraPay = Number(row[22]) || 0;
    const deduction = Number(row[23]) || 0;
    const directSubtotal = Number(row[26]) || (basicPay + overtimePay + nightPay + holidayPay + holidayOvertimePay + mealAllowance + transportAllowance + annualLeavePay + extraPay - lateDeduction - deduction);

    // 4대보험 (근로자 부담)
    const np = Number(row[27]) || Math.round(directSubtotal * 0.045);  // 국민연금 4.5%
    const hi = Number(row[28]) || Math.round(directSubtotal * 0.03545); // 건강보험 3.545%
    const lt = Number(row[29]) || Math.round(hi * 0.1295);              // 장기요양 12.95%
    const ei = Number(row[30]) || Math.round(directSubtotal * 0.009);   // 고용보험 0.9%

    // 원천세 (간이세액표 기반 — 단순 3.3% 또는 누진)
    const incomeTax = Math.round(directSubtotal * 0.033);  // 사업소득 3% 또는 근로소득세
    const localTax = Math.round(incomeTax * 0.1);          // 지방소득세

    const totalDeductions = np + hi + lt + ei + incomeTax + localTax + lateDeduction + deduction;
    const netPay = directSubtotal - np - hi - lt - ei - incomeTax - localTax;

    employees.push({
      no, name,
      gender: String(row[2] || ""),
      hireDate: excelDateToStr(row[3]),
      resignDate: excelDateToStr(row[4]),
      hourlyRate,
      workDays: Number(row[6]) || 0,
      workHours: Number(row[7]) || 0,
      overtimeHours: Number(row[8]) || 0,
      nightHours: Number(row[9]) || 0,
      holidayHours: Number(row[10]) || 0,
      holidayOvertimeHours: Number(row[11]) || 0,
      lateHours: Number(row[12]) || 0,
      basicPay, overtimePay, nightPay, holidayPay, holidayOvertimePay, lateDeduction,
      mealAllowance, transportAllowance, annualLeavePay, extraPay, deduction,
      directSubtotal,
      nationalPension: np, healthInsurance: hi, longTermCare: lt, employmentInsurance: ei,
      incomeTax, localTax, netPay,
    });
  }

  return { employees, clientName, yearMonth };
}

// RawEmployee → PayslipData (명세서 양식)
function toPayslipData(emp: RawEmployee, yearMonth: string, clientName: string): PayslipData {
  const totalPayments = emp.basicPay + emp.overtimePay + emp.nightPay + emp.holidayPay + emp.holidayOvertimePay
    + emp.mealAllowance + emp.transportAllowance + emp.annualLeavePay + emp.extraPay;
  const totalDeductions = emp.nationalPension + emp.healthInsurance + emp.longTermCare + emp.employmentInsurance
    + emp.incomeTax + emp.localTax + emp.lateDeduction + emp.deduction;
  return {
    employeeName: emp.name,
    employeeNo: `EMP-${String(emp.no).padStart(3, "0")}`,
    department: "생산",
    position: "사원",
    contractType: "PERSONAL_OUTSOURCING",
    userBusinessName: clientName,
    yearMonth,
    payDate: `${yearMonth}-10`,
    payments: {
      basicPay: emp.basicPay,
      overtimePay: emp.overtimePay,
      nightPay: emp.nightPay,
      holidayPay: emp.holidayPay + emp.holidayOvertimePay,
      bonus: 0,
      otherPay: emp.mealAllowance + emp.transportAllowance + emp.annualLeavePay + emp.extraPay,
    },
    deductions: {
      nationalPension: emp.nationalPension,
      healthInsurance: emp.healthInsurance,
      longTermCare: emp.longTermCare,
      employmentInsurance: emp.employmentInsurance,
      incomeTax: emp.incomeTax,
      localTax: emp.localTax,
      otherDeduction: emp.lateDeduction + emp.deduction,
    },
    totalPayments,
    totalDeductions,
    netPay: totalPayments - totalDeductions,
    attendance: {
      workDays: emp.workDays,
      totalHours: emp.workHours,
      overtimeHours: emp.overtimeHours + emp.holidayOvertimeHours,
    },
  };
}

export default function AdminPayslipBatch() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [employees, setEmployees] = useState<RawEmployee[]>([]);
  const [clientName, setClientName] = useState("");
  const [yearMonth, setYearMonth] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipientMap, setEmailRecipientMap] = useState<Record<number, string>>({});
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const company: CompanyInfo = useMemo(() => ({
    name: companyInfo?.company_name || "주식회사 더웰파트너",
    ceoName: companyInfo?.ceo_name || "김범석",
    businessNo: companyInfo?.business_no || "265-88-01190",
    address: companyInfo?.address || "경기도 수원시 권선구 경수대로 371 2층",
    phone: companyInfo?.phone || "1666-7663",
    email: companyInfo?.email || "2021thewell@gmail.com",
    sealUrl: "/seal.png",
  }), [companyInfo]);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });
      const result = parseExcelToEmployees(wb);
      if (!result || result.employees.length === 0) {
        handleError(new Error("엑셀에서 직원 데이터를 추출할 수 없습니다."));
        return;
      }
      setEmployees(result.employees);
      setClientName(result.clientName || "(미지정)");
      setYearMonth(result.yearMonth || new Date().toISOString().slice(0, 7));
      setSelected(new Set(result.employees.map((e) => e.no)));
      try {
        const settings = await api.systemSettings.get();
        setCompanyInfo(settings || {});
      } catch {/* 기본값 */}
      handleSuccess(`${result.employees.length}명 직원 인식 완료. 시트: 자동 감지`);
    } catch (e: any) {
      handleError(e, { fallback: "엑셀 처리 실패" });
    } finally { setParsing(false); }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  }, []);

  const toggleSelect = (no: number) => {
    const next = new Set(selected);
    if (next.has(no)) next.delete(no); else next.add(no);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === employees.length) setSelected(new Set());
    else setSelected(new Set(employees.map((e) => e.no)));
  };

  const handlePreview = (emp: RawEmployee) => {
    const data = toPayslipData(emp, yearMonth, clientName);
    setPreviewHTML(renderPayslip(data, company));
  };

  const handleSinglePDF = async (emp: RawEmployee) => {
    setGenerating(true);
    try {
      const data = toPayslipData(emp, yearMonth, clientName);
      const html = renderPayslip(data, company);
      const blob = await generatePDFFromHTML(html, "");
      downloadPDF(blob, `${yearMonth}_급여명세서_${emp.name}.pdf`);
      handleSuccess(`${emp.name}님 명세서 다운로드 완료`);
    } catch (e: any) {
      handleError(e, { fallback: "PDF 생성 실패" });
    } finally { setGenerating(false); }
  };

  // ZIP 일괄 다운로드
  const handleBatchZIP = async () => {
    const targets = employees.filter((e) => selected.has(e.no));
    if (targets.length === 0) { handleError(new Error("선택된 직원이 없습니다.")); return; }
    setGenerating(true);
    setBatchProgress({ current: 0, total: targets.length });
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder(`${yearMonth}_급여명세서`)!;
      for (let i = 0; i < targets.length; i++) {
        const emp = targets[i];
        const data = toPayslipData(emp, yearMonth, clientName);
        const html = renderPayslip(data, company);
        const blob = await generatePDFFromHTML(html, "");
        const buffer = await blob.arrayBuffer();
        folder.file(`${emp.name}_급여명세서.pdf`, buffer);
        setBatchProgress({ current: i + 1, total: targets.length });
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadPDF(zipBlob, `${yearMonth}_급여명세서_${targets.length}명.zip`);
      handleSuccess(`${targets.length}명 명세서 ZIP 다운로드 완료`);
    } catch (e: any) {
      handleError(e, { fallback: "ZIP 생성 실패" });
    } finally { setGenerating(false); setBatchProgress({ current: 0, total: 0 }); }
  };

  // 일괄 이메일 발송
  const handleBatchEmail = async () => {
    const targets = employees.filter((e) => selected.has(e.no) && emailRecipientMap[e.no]);
    if (targets.length === 0) { handleError(new Error("이메일 입력된 선택 직원이 없습니다.")); return; }
    setGenerating(true);
    setBatchProgress({ current: 0, total: targets.length });
    let success = 0, failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const emp = targets[i];
        try {
          const data = toPayslipData(emp, yearMonth, clientName);
          const html = renderPayslip(data, company);
          const blob = await generatePDFFromHTML(html, "");
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await api.emailApi.send({
            to: emailRecipientMap[emp.no],
            subject: `[${company.name}] ${yearMonth} 급여명세서`,
            html: `<div style="font-family:'Pretendard',sans-serif;padding:20px;"><h2>${emp.name}님 안녕하세요</h2><p>${yearMonth} 급여명세서를 송부드립니다.</p><p><strong>실수령액: ${data.netPay.toLocaleString()}원</strong></p></div>`,
            attachments: [{ filename: `${yearMonth}_급여명세서_${emp.name}.pdf`, content: base64 }],
            replyTo: company.email,
            type: "PAYSLIP",
          });
          success++;
        } catch { failed++; }
        setBatchProgress({ current: i + 1, total: targets.length });
      }
      handleSuccess(`발송 완료: 성공 ${success}명 / 실패 ${failed}명`);
    } finally {
      setGenerating(false);
      setBatchProgress({ current: 0, total: 0 });
      setEmailModalOpen(false);
    }
  };

  const totalNet = useMemo(() => employees.filter((e) => selected.has(e.no)).reduce((s, e) => s + e.netPay, 0), [employees, selected]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-navy)]">명세서 일괄 발행</h1>
        <p className="text-sm text-gray-500 mt-1">엑셀 업로드 → 지급 시트 자동 인식 → 직원별 명세서 PDF/ZIP/이메일 발송</p>
      </div>

      {/* 업로드 영역 */}
      {employees.length === 0 && (
        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`bg-white rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all ${
            dragActive ? "border-[var(--brand-blue)] bg-blue-50" : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
          }`}
        >
          <FileSpreadsheet size={40} className="mx-auto text-blue-400 mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-[var(--brand-navy)] mb-2">엑셀 파일 업로드 (지급 시트 자동 인식)</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-4">엘티와이 양식의 .xlsx / .xls 파일을 드래그하거나 클릭</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
          <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} disabled={parsing} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-blue)] text-white font-semibold disabled:opacity-50 min-h-[44px]">
            {parsing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} 파일 선택
          </button>
        </div>
      )}

      {/* 결과 영역 */}
      {employees.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">사용사업자</div>
              <div className="text-sm font-bold text-[var(--brand-navy)] truncate">{clientName}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">귀속월</div>
              <div className="text-sm font-bold text-[var(--brand-navy)]">{yearMonth}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">선택 / 전체</div>
              <div className="text-sm font-bold text-[var(--brand-navy)]">{selected.size} / {employees.length}명</div>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <div className="text-xs text-gray-500 mb-1">선택 실수령 합계</div>
              <div className="text-sm font-bold text-green-600">{totalNet.toLocaleString()}원</div>
            </div>
          </div>

          {/* 일괄 액션 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <button onClick={() => { setEmployees([]); setSelected(new Set()); }} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 min-h-[44px]">
              <Upload size={14} /> 다른 엑셀 업로드
            </button>
            <button onClick={handleBatchZIP} disabled={generating || selected.size === 0} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]">
              {generating ? <Loader2 className="animate-spin" size={14} /> : <Archive size={14} />}
              ZIP 일괄 다운로드 ({selected.size}명)
            </button>
            <button onClick={() => setEmailModalOpen(true)} disabled={generating || selected.size === 0} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]">
              <Mail size={14} /> 일괄 이메일 발송
            </button>
          </div>

          {batchProgress.total > 0 && (
            <div className="mb-4 bg-blue-50 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-[var(--brand-navy)]">처리중...</span>
                <span className="text-gray-600">{batchProgress.current} / {batchProgress.total}</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--brand-blue)] transition-all" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* 직원 목록 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-bold text-[var(--brand-navy)]">직원 명세서 ({employees.length}명)</div>
              <button onClick={toggleAll} className="text-xs text-[var(--brand-blue)] font-semibold">
                {selected.size === employees.length ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center w-10"></th>
                    <th className="px-3 py-2 text-left">번호</th>
                    <th className="px-3 py-2 text-left">성명</th>
                    <th className="px-3 py-2 text-right">근무시간</th>
                    <th className="px-3 py-2 text-right">총 지급</th>
                    <th className="px-3 py-2 text-right">총 공제</th>
                    <th className="px-3 py-2 text-right">실수령액</th>
                    <th className="px-3 py-2 text-center">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const data = toPayslipData(emp, yearMonth, clientName);
                    const isSel = selected.has(emp.no);
                    return (
                      <tr key={emp.no} className={`border-t border-gray-50 hover:bg-blue-50/30 ${isSel ? "bg-blue-50/50" : ""}`}>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(emp.no)} className="w-4 h-4" />
                        </td>
                        <td className="px-3 py-2">{emp.no}</td>
                        <td className="px-3 py-2 font-medium">{emp.name}</td>
                        <td className="px-3 py-2 text-right">{emp.workHours}h</td>
                        <td className="px-3 py-2 text-right">{data.totalPayments.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{data.totalDeductions.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-bold text-green-600">{data.netPay.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handlePreview(emp)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="미리보기"><Eye size={14} /></button>
                            <button onClick={() => handleSinglePDF(emp)} disabled={generating} className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 disabled:opacity-50" title="PDF"><Download size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 미리보기 모달 */}
      {previewHTML && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setPreviewHTML(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b">
              <h3 className="font-bold">명세서 미리보기</h3>
              <button onClick={() => setPreviewHTML(null)} className="text-gray-400 hover:text-gray-600 p-2 -m-2">✕</button>
            </div>
            <div className="overflow-auto p-2 sm:p-4 flex-1 flex justify-center" dangerouslySetInnerHTML={{ __html: previewHTML }} />
          </div>
        </div>
      )}

      {/* 일괄 이메일 모달 */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setEmailModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b">
              <h3 className="font-bold">일괄 이메일 발송 ({selected.size}명)</h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 p-2 -m-2">✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-xs mb-3">
                <AlertCircle size={14} /> 직원별로 이메일 주소를 입력하세요. 미입력 직원은 발송되지 않습니다.
              </div>
              <div className="space-y-2">
                {employees.filter((e) => selected.has(e.no)).map((emp) => (
                  <div key={emp.no} className="flex items-center gap-2">
                    <span className="w-20 text-sm font-medium">{emp.name}</span>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={emailRecipientMap[emp.no] || ""}
                      onChange={(e) => setEmailRecipientMap({ ...emailRecipientMap, [emp.no]: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t bg-gray-50 flex gap-2">
              <button onClick={() => setEmailModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">취소</button>
              <button onClick={handleBatchEmail} disabled={generating} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                {generating ? <Loader2 className="animate-spin mx-auto" size={14} /> : "발송 시작"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
