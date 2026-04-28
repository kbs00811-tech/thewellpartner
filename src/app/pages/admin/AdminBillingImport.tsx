import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, Eye, Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import * as XLSX from "xlsx";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { renderDetailedBilling, generatePDFFromHTML, downloadPDF } from "../../lib/documents/templates";
import type { DetailedBillingData, CompanyInfo } from "../../lib/documents/types";

// 엑셀 → DetailedBillingData 변환
function parseExcelToBilling(workbook: XLSX.WorkBook): DetailedBillingData | null {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // 회사명 (1행)
  // 귀속월 (4행) — "2026 년 4 월"
  // 사용사업자 (5행)
  let yearMonth = "";
  let clientCompanyName = "";
  let payDate = "10일";

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const text = row.join(" ");
    if (!yearMonth) {
      const m = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
      if (m) yearMonth = `${m[1]}-${String(m[2]).padStart(2, "0")}`;
    }
    if (!clientCompanyName) {
      const m = text.match(/사용사업자\s*[:：]?\s*([^\s]+\s*[^\s]*)/);
      if (m) clientCompanyName = m[1].trim();
    }
    const m2 = text.match(/급여일\s*[:=：]?\s*(\d+\s*일)/);
    if (m2) payDate = m2[1];
  }

  // 직원 행 찾기 (번호 = 1, 2, 3...)
  const employees: DetailedBillingData["employees"] = [];
  let totalDirectCost = 0, totalIndirectCost = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const no = Number(row[0]);
    if (!no || isNaN(no)) continue;
    const name = String(row[1] || "").trim();
    if (!name) continue;
    const gender = String(row[2] || "").trim();

    // 날짜 변환 (Excel serial → YYYY-MM-DD)
    const excelDateToStr = (v: any): string => {
      if (!v) return "";
      if (typeof v === "string") return v;
      const n = Number(v);
      if (isNaN(n) || n < 1) return "";
      // Excel epoch: 1899-12-30
      const date = new Date(Math.round((n - 25569) * 86400 * 1000));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const hireDate = excelDateToStr(row[3]);
    const resignDate = excelDateToStr(row[4]);
    const hourlyRate = Number(row[5]) || 0;

    // 근태
    const workDays = Number(row[6]) || 0;
    const workHours = Number(row[7]) || 0;
    const overtimeHours = Number(row[8]) || 0;
    const nightHours = Number(row[9]) || 0;
    const holidayHours = Number(row[10]) || 0;
    const holidayOvertimeHours = Number(row[11]) || 0;
    const lateHours = Number(row[12]) || 0;

    // 급여
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

    // 직접비 소계
    const directSubtotal = Number(row[26]) || (basicPay + overtimePay + nightPay + holidayPay + holidayOvertimePay + mealAllowance + transportAllowance + annualLeavePay + extraPay - lateDeduction - deduction);

    // 4대보험
    const nationalPension = Number(row[27]) || 0;
    const healthInsurance = Number(row[28]) || 0;
    const longTermCare = Number(row[29]) || 0;
    const employmentInsurance = Number(row[30]) || 0;
    const industrialAccident = Number(row[31]) || 0;
    const insuranceTotal = Number(row[32]) || (nationalPension + healthInsurance + longTermCare + employmentInsurance + industrialAccident);

    // 추가 간접비
    const businessIncomeTax = Number(row[33]) || 0;
    const profitReserve = Number(row[34]) || 0;
    const retirement = Number(row[35]) || 0;

    const grandTotal = Number(row[36]) || (directSubtotal + insuranceTotal + businessIncomeTax + profitReserve + retirement);

    employees.push({
      no, name, gender, hireDate, resignDate, hourlyRate,
      workDays, workHours, overtimeHours, nightHours, holidayHours, holidayOvertimeHours, lateHours,
      basicPay, overtimePay, nightPay, holidayPay, holidayOvertimePay, lateDeduction,
      mealAllowance, transportAllowance, annualLeavePay, extraPay, deduction,
      directSubtotal,
      nationalPension, healthInsurance, longTermCare, employmentInsurance, industrialAccident, insuranceTotal,
      businessIncomeTax, profitReserve, retirement, grandTotal,
    });

    totalDirectCost += directSubtotal;
    totalIndirectCost += insuranceTotal + businessIncomeTax + profitReserve + retirement;
  }

  if (employees.length === 0) return null;

  const totalSupplyAmount = totalDirectCost + totalIndirectCost;
  const vatAmount = Math.round(totalSupplyAmount * 0.1);
  const finalAmount = totalSupplyAmount + vatAmount;

  return {
    contractType: "PERSONAL_OUTSOURCING",
    yearMonth,
    clientCompanyName,
    payDate,
    employees,
    totalDirectCost,
    totalIndirectCost,
    totalSupplyAmount,
    vatAmount,
    finalAmount,
    insuranceRates: {
      nationalPension: 4.75,
      healthInsurance: 3.595,
      longTermCare: 13.14,
      employmentInsurance: 1.8,
      industrialAccident: 2.0,
    },
  };
}

export default function AdminBillingImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<DetailedBillingData | null>(null);
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const company: CompanyInfo = {
    name: companyInfo?.company_name || "주식회사 더웰파트너",
    ceoName: companyInfo?.ceo_name || "김범석",
    businessNo: companyInfo?.business_no || "265-88-01190",
    address: companyInfo?.address || "경기도 수원시 권선구 경수대로 371 2층",
    phone: companyInfo?.phone || "1666-7663",
    email: companyInfo?.email || "2021thewell@gmail.com",
    sealUrl: "/seal.png",
  };

  // 엑셀 업로드 처리
  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const parsed = parseExcelToBilling(workbook);
      if (!parsed) {
        handleError(new Error("엑셀에서 데이터를 추출할 수 없습니다. 양식을 확인해주세요."));
        return;
      }
      setData(parsed);
      // 회사 정보 로드
      try {
        const settings = await api.systemSettings.get();
        setCompanyInfo(settings || {});
      } catch {/* 기본값 사용 */}
      handleSuccess(`${parsed.employees.length}명 직원 데이터 파싱 완료. 청구합계: ${parsed.finalAmount.toLocaleString()}원`);
    } catch (e: any) {
      handleError(e, { fallback: "엑셀 파싱 실패" });
    } finally { setParsing(false); }
  };

  const handlePreview = () => {
    if (!data) return;
    setPreviewHTML(renderDetailedBilling(data, company));
  };

  const handleDownloadPDF = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      const html = renderDetailedBilling(data, company);
      const blob = await generatePDFFromHTML(html, "", "l"); // 가로 방향
      const fileName = `급여청구내역서_${data.clientCompanyName}_${data.yearMonth}.pdf`;
      downloadPDF(blob, fileName);
      handleSuccess("PDF가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "PDF 생성 실패" });
    } finally { setGenerating(false); }
  };

  // 시스템 등록 (클라이언트 + 직원 + 청구서)
  const handleImportToSystem = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      // 1. 고객사 등록 (없으면 생성)
      const allClients: any[] = await api.erpApi.clientCompanies.list().catch(() => []) as any;
      let clientId = (allClients || []).find((c: any) => (c.name || c.company_name) === data.clientCompanyName)?.id;
      if (!clientId) {
        const created = await api.erpApi.clientCompanies.create({ name: data.clientCompanyName, company_name: data.clientCompanyName });
        clientId = (created as any).id;
      }
      // 2. 청구서 저장
      await api.settlementApi.partnerBillings.create({
        client_company_id: clientId,
        year_month: data.yearMonth,
        total_hours: data.employees.reduce((s, e) => s + e.workHours + e.overtimeHours, 0),
        total_amount: data.totalSupplyAmount,
        vat_amount: data.vatAmount,
        final_amount: data.finalAmount,
        status: "DRAFT",
        source: "EXCEL_IMPORT",
        employee_count: data.employees.length,
      });
      handleSuccess(`고객사(${data.clientCompanyName}) + 청구서(${data.yearMonth}) 시스템 등록 완료`);
    } catch (e: any) {
      handleError(e, { fallback: "시스템 등록 실패" });
    } finally { setGenerating(false); }
  };

  // 이메일 발송
  const handleSendEmail = async () => {
    if (!data || !emailRecipient) return;
    setGenerating(true);
    try {
      const html = renderDetailedBilling(data, company);
      const blob = await generatePDFFromHTML(html, "", "l");
      const fileName = `급여청구내역서_${data.clientCompanyName}_${data.yearMonth}.pdf`;
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await api.emailApi.send({
        to: emailRecipient,
        subject: `[${company.name}] ${data.yearMonth} 급여청구내역서`,
        html: `<div style="font-family:'Pretendard',sans-serif;padding:20px;"><h2>${company.name}</h2><p>${data.yearMonth} 급여청구내역서를 송부드립니다.</p><p><strong>청구합계: ${data.finalAmount.toLocaleString()}원</strong></p></div>`,
        attachments: [{ filename: fileName, content: base64 }],
        replyTo: company.email,
        type: "INVOICE",
      });
      handleSuccess(`${emailRecipient} 으로 이메일 발송 완료`);
      setShowEmail(false);
      setEmailRecipient("");
    } catch (e: any) {
      handleError(e, { fallback: "이메일 발송 실패" });
    } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--brand-navy)]">급여청구내역서 - 엑셀 임포트</h1>
        <p className="text-sm text-gray-500 mt-1">기존 엑셀 양식 그대로 업로드 → PDF 발행 / 시스템 등록 / 이메일 발송</p>
      </div>

      {/* 업로드 영역 */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-10 text-center mb-6">
        <FileSpreadsheet size={48} className="mx-auto text-blue-400 mb-3" />
        <h3 className="text-lg font-bold text-[var(--brand-navy)] mb-2">급여청구내역서 엑셀 업로드</h3>
        <p className="text-sm text-gray-500 mb-5">엘티와이 양식 형태의 엑셀 파일 (.xlsx)을 업로드하세요</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-blue)] text-white font-semibold disabled:opacity-50"
        >
          {parsing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          엑셀 파일 선택
        </button>
      </div>

      {/* 파싱 결과 */}
      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-green-500" />
            <h3 className="font-bold text-[var(--brand-navy)]">파싱 완료</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">사용사업자</div>
              <div className="text-sm font-bold text-[var(--brand-navy)]">{data.clientCompanyName}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">귀속월</div>
              <div className="text-sm font-bold text-[var(--brand-navy)]">{data.yearMonth}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">직원 수</div>
              <div className="text-sm font-bold text-[var(--brand-navy)]">{data.employees.length}명</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">청구합계</div>
              <div className="text-sm font-bold text-green-600">{data.finalAmount.toLocaleString()}원</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button onClick={handlePreview} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
              <Eye size={14} /> 미리보기
            </button>
            <button onClick={handleDownloadPDF} disabled={generating} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--brand-blue)] text-white text-sm font-semibold disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />} PDF 다운로드
            </button>
            <button onClick={handleImportToSystem} disabled={generating} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50">
              <FileSpreadsheet size={14} /> 시스템 등록
            </button>
            <button onClick={() => setShowEmail(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold">
              <Mail size={14} /> 이메일 발송
            </button>
          </div>
        </div>
      )}

      {/* 직원 목록 미리보기 */}
      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-[var(--brand-navy)]">직원별 명세 ({data.employees.length}명)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">번호</th>
                  <th className="px-3 py-2 text-left">성명</th>
                  <th className="px-3 py-2 text-right">시급</th>
                  <th className="px-3 py-2 text-right">근무시간</th>
                  <th className="px-3 py-2 text-right">기본급</th>
                  <th className="px-3 py-2 text-right">잔업수당</th>
                  <th className="px-3 py-2 text-right">직접비 소계</th>
                  <th className="px-3 py-2 text-right">4대보험 합계</th>
                  <th className="px-3 py-2 text-right">총 합계</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.no} className="border-t border-gray-50">
                    <td className="px-3 py-2">{e.no}</td>
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2 text-right">{e.hourlyRate.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{e.workHours}</td>
                    <td className="px-3 py-2 text-right">{e.basicPay.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{e.overtimePay.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold">{e.directSubtotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{e.insuranceTotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-600">{e.grandTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {previewHTML && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewHTML(null)}>
          <div className="bg-white rounded-2xl max-w-[95vw] w-full max-h-[95vh] overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-white pb-2 border-b">
              <h3 className="text-lg font-bold">미리보기 (A4 가로)</h3>
              <button onClick={() => setPreviewHTML(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: previewHTML }} />
          </div>
        </div>
      )}

      {/* 이메일 모달 */}
      {showEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEmail(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--brand-navy)] mb-4">이메일 발송</h3>
            <input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="수신자 이메일" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowEmail(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">취소</button>
              <button onClick={handleSendEmail} disabled={generating || !emailRecipient} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                {generating ? <Loader2 className="animate-spin mx-auto" size={14} /> : "발송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
