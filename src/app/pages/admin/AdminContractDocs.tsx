import { useState, useEffect } from "react";
import { FileText, FileCheck, Receipt, Download, Loader2, Building2, Hash } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { CONTRACT_TYPE_LABEL, CONTRACT_TYPE_DESC } from "../../lib/documents/types";
import type { ContractType, ContractData, InvoiceData, TaxInvoiceData, CompanyInfo, ClientInfo } from "../../lib/documents/types";
import { renderContract, renderInvoice, renderTaxInvoice, generatePDFFromHTML, downloadPDF } from "../../lib/documents/templates";

type DocType = "contract" | "invoice" | "tax-invoice";

const DOC_LABEL: Record<DocType, string> = {
  contract: "계약서",
  invoice: "청구서",
  "tax-invoice": "세금계산서",
};

export default function AdminContractDocs() {
  const [docType, setDocType] = useState<DocType>("contract");
  const [contractType, setContractType] = useState<ContractType>("PERSONAL_OUTSOURCING");
  const [clients, setClients] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedBilling, setSelectedBilling] = useState<string>("");
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  // 폼 데이터 (계약서)
  const [contractForm, setContractForm] = useState<Partial<ContractData>>({
    contractDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    workSite: "",
    workDescription: "",
    paymentTerm: "매월 말일 마감, 익월 10일 지급",
  });

  useEffect(() => {
    (async () => {
      try {
        const [clientRes, settingsRes, billRes] = await Promise.all([
          api.erpApi.clientCompanies.list().catch(() => []),
          api.systemSettings.get().catch(() => ({})),
          api.settlementApi.partnerBillings.list().catch(() => []),
        ]);
        setClients(Array.isArray(clientRes) ? clientRes : []);
        setBillings(Array.isArray(billRes) ? billRes : []);
        setCompanyInfo(settingsRes || {});
      } catch (e) { handleError(e, { fallback: "데이터 로드 실패" }); }
    })();
  }, []);

  const company: CompanyInfo = {
    name: companyInfo?.company_name || "주식회사 더웰파트너",
    ceoName: companyInfo?.ceo_name || "김범석",
    businessNo: companyInfo?.business_no || "265-88-01190",
    address: companyInfo?.address || "경기도 수원시 권선구 경수대로 371 2층",
    phone: companyInfo?.phone || "1666-7663",
    email: companyInfo?.email || "2021thewell@gmail.com",
    sealUrl: "/seal.png",
  };

  const getClient = (): ClientInfo | null => {
    const c = clients.find((c: any) => c.id === selectedClient);
    if (!c) return null;
    return {
      name: c.name || c.company_name || "",
      ceoName: c.ceo_name || c.representative || "",
      businessNo: c.business_no || c.business_number || "",
      address: c.address || "",
      phone: c.phone || "",
      contactPerson: c.contact_person || c.manager_name || "",
    };
  };

  // 계약서 발행
  const handleGenerateContract = async () => {
    const client = getClient();
    if (!client) { handleError(new Error("파트너사를 선택해주세요.")); return; }

    setGenerating(true);
    try {
      const data: ContractData = {
        contractType,
        contractNo: `TWP-CON-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        contractDate: contractForm.contractDate!,
        startDate: contractForm.startDate!,
        endDate: contractForm.endDate || "협의",
        workSite: contractForm.workSite || "협의",
        workDescription: contractForm.workDescription || "협의",
        paymentTerm: contractForm.paymentTerm!,
        ...(contractType === "PERSONAL_OUTSOURCING" && {
          personalDetails: {
            headcount: 0, workHoursPerDay: 8, workDaysPerWeek: 5,
            siteManager: contractForm.personalDetails?.siteManager || company.ceoName,
            rateTable: [],
            ...(contractForm.personalDetails || {}),
          },
        }),
        ...(contractType === "PRODUCTION_OUTSOURCING" && {
          productionDetails: {
            productName: "", targetQuantity: 0, qualityStandard: "협의",
            rateTable: [],
            ...(contractForm.productionDetails || {}),
          },
        }),
        ...(contractType === "DISPATCH" && {
          dispatchDetails: {
            dispatchPeriod: `${contractForm.startDate} ~ ${contractForm.endDate}`,
            workTime: "09:00 ~ 18:00", restTime: "12:00 ~ 13:00", holiday: "주말 및 공휴일",
            dispatchFee: 0, workerWage: 0,
            userBusinessName: client.name, userManagerName: client.contactPerson || "-",
            safetyManager: company.ceoName,
            ...(contractForm.dispatchDetails || {}),
          },
        }),
      };
      const html = renderContract(data, company, client);
      const blob = await generatePDFFromHTML(html, "");
      downloadPDF(blob, `${CONTRACT_TYPE_LABEL[contractType]}_계약서_${client.name}_${data.contractDate}.pdf`);
      handleSuccess("계약서가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "계약서 발행 실패" });
    } finally { setGenerating(false); }
  };

  // 청구서 발행 (DB 청구서 데이터 활용)
  const handleGenerateInvoice = async () => {
    const billing = billings.find((b: any) => b.id === selectedBilling);
    if (!billing) { handleError(new Error("청구서를 선택해주세요.")); return; }
    const client = clients.find((c: any) => c.id === billing.client_company_id);
    if (!client) { handleError(new Error("파트너사 정보가 없습니다.")); return; }

    setGenerating(true);
    try {
      const clientInfo: ClientInfo = {
        name: client.name || client.company_name,
        ceoName: client.ceo_name || "",
        businessNo: client.business_no || "",
        address: client.address || "",
      };
      const data: InvoiceData = {
        contractType,
        invoiceNo: `INV-${billing.year_month.replace("-", "")}-${String(billing.id).slice(0, 4)}`,
        invoiceDate: new Date().toISOString().split("T")[0],
        yearMonth: billing.year_month,
        dueDate: companyInfo?.payment_due_date || "익월 10일",
        items: [{
          description: contractType === "PERSONAL_OUTSOURCING" ? `${billing.year_month} 인력 도급용역료`
            : contractType === "PRODUCTION_OUTSOURCING" ? `${billing.year_month} 생산 도급용역료`
            : `${billing.year_month} 파견근로자 인건비 및 수수료`,
          quantity: billing.total_hours || 0,
          unit: contractType === "PRODUCTION_OUTSOURCING" ? "개" : "시간",
          unitPrice: billing.total_hours > 0 ? Math.round(billing.total_amount / billing.total_hours) : 0,
          amount: billing.total_amount || 0,
        }],
        subtotal: billing.total_amount || 0,
        vatAmount: billing.vat_amount || 0,
        total: billing.final_amount || 0,
        bankInfo: {
          bankName: companyInfo?.bank_name || "신한은행",
          accountNumber: companyInfo?.bank_account || "000-000-000000",
          accountHolder: companyInfo?.bank_holder || company.name,
        },
      };
      const html = renderInvoice(data, company, clientInfo);
      const blob = await generatePDFFromHTML(html, "");
      downloadPDF(blob, `청구서_${clientInfo.name}_${billing.year_month}.pdf`);
      handleSuccess("청구서가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "청구서 발행 실패" });
    } finally { setGenerating(false); }
  };

  // 세금계산서 발행
  const handleGenerateTaxInvoice = async () => {
    const billing = billings.find((b: any) => b.id === selectedBilling);
    if (!billing) { handleError(new Error("청구서를 선택해주세요.")); return; }
    const client = clients.find((c: any) => c.id === billing.client_company_id);
    if (!client) { handleError(new Error("파트너사 정보가 없습니다.")); return; }

    setGenerating(true);
    try {
      const clientInfo: ClientInfo = {
        name: client.name || client.company_name,
        ceoName: client.ceo_name || "",
        businessNo: client.business_no || "",
        address: client.address || "",
        contactPerson: client.contact_person || "",
      };
      const [year, month] = billing.year_month.split("-");
      const data: TaxInvoiceData = {
        contractType,
        taxInvoiceNo: `${year}${month}${String(Date.now()).slice(-6)}`,
        issueDate: new Date().toISOString().split("T")[0],
        yearMonth: billing.year_month,
        items: [{
          monthDay: `${month}/${new Date().getDate()}`,
          description: contractType === "PERSONAL_OUTSOURCING" ? `${billing.year_month} 인력 도급용역`
            : contractType === "PRODUCTION_OUTSOURCING" ? `${billing.year_month} 생산 도급용역`
            : `${billing.year_month} 근로자파견 수수료`,
          spec: "-",
          quantity: 1,
          unitPrice: billing.total_amount || 0,
          supplyAmount: billing.total_amount || 0,
          taxAmount: billing.vat_amount || 0,
        }],
        totalSupplyAmount: billing.total_amount || 0,
        totalTaxAmount: billing.vat_amount || 0,
        totalAmount: billing.final_amount || 0,
        creditAmount: billing.final_amount || 0,
        receiptType: billing.status === "PAID" ? "영수" : "청구",
      };
      const html = renderTaxInvoice(data, company, clientInfo);
      const blob = await generatePDFFromHTML(html, "");
      downloadPDF(blob, `세금계산서_${clientInfo.name}_${billing.year_month}.pdf`);
      handleSuccess("세금계산서가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "세금계산서 발행 실패" });
    } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--brand-navy)]">계약·청구 양식 발행</h1>
        <p className="text-sm text-gray-500 mt-1">분야별(인적/생산/파견) 표준 양식을 자동 생성합니다.</p>
      </div>

      {/* 계약 형태 선택 */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-gray-500 mb-2 block">계약 형태</label>
        <div className="grid grid-cols-3 gap-3">
          {(["PERSONAL_OUTSOURCING", "PRODUCTION_OUTSOURCING", "DISPATCH"] as ContractType[]).map((t) => (
            <button
              key={t}
              onClick={() => setContractType(t)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                contractType === t
                  ? "border-[var(--brand-blue)] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-sm text-[var(--brand-navy)]">{CONTRACT_TYPE_LABEL[t]}</div>
              <div className="text-xs text-gray-500 mt-1">{CONTRACT_TYPE_DESC[t]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 양식 종류 탭 */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {(["contract", "invoice", "tax-invoice"] as DocType[]).map((d) => {
          const Icon = d === "contract" ? FileText : d === "invoice" ? Receipt : FileCheck;
          return (
            <button
              key={d}
              onClick={() => setDocType(d)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                docType === d
                  ? "text-[var(--brand-blue)] border-b-2 border-[var(--brand-blue)]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={15} /> {DOC_LABEL[d]}
            </button>
          );
        })}
      </div>

      {/* 계약서 폼 */}
      {docType === "contract" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block flex items-center gap-1"><Building2 size={12} /> 파트너사 *</label>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
              <option value="">선택</option>
              {clients.map((c: any) => (<option key={c.id} value={c.id}>{c.name || c.company_name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">계약 체결일</label>
              <input type="date" value={contractForm.contractDate} onChange={(e) => setContractForm({ ...contractForm, contractDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">계약 종료일</label>
              <input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">작업 장소</label>
            <input type="text" value={contractForm.workSite} onChange={(e) => setContractForm({ ...contractForm, workSite: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="예: 경기도 화성시 ○○공장" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">업무 내용</label>
            <textarea value={contractForm.workDescription} onChange={(e) => setContractForm({ ...contractForm, workDescription: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="구체적인 업무 내용을 기재하세요" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">대금 지급 조건</label>
            <input type="text" value={contractForm.paymentTerm} onChange={(e) => setContractForm({ ...contractForm, paymentTerm: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
          </div>
          <button onClick={handleGenerateContract} disabled={generating || !selectedClient} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--brand-blue)] text-white font-semibold disabled:opacity-50">
            {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {CONTRACT_TYPE_LABEL[contractType]} 계약서 PDF 발행
          </button>
        </div>
      )}

      {/* 청구서 / 세금계산서 폼 */}
      {(docType === "invoice" || docType === "tax-invoice") && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block flex items-center gap-1"><Hash size={12} /> 청구 데이터 선택 *</label>
            <select value={selectedBilling} onChange={(e) => setSelectedBilling(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
              <option value="">청구서 선택</option>
              {billings.map((b: any) => {
                const c = clients.find((c: any) => c.id === b.client_company_id);
                return (
                  <option key={b.id} value={b.id}>
                    {c?.name || c?.company_name || "—"} / {b.year_month} / {(b.final_amount || 0).toLocaleString()}원 / {b.status}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-400 mt-2">※ 청구서는 "정산 관리 → 고객사 청구"에서 먼저 생성해야 합니다.</p>
          </div>
          <button
            onClick={docType === "invoice" ? handleGenerateInvoice : handleGenerateTaxInvoice}
            disabled={generating || !selectedBilling}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--brand-blue)] text-white font-semibold disabled:opacity-50"
          >
            {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {DOC_LABEL[docType]} PDF 발행
          </button>
        </div>
      )}
    </div>
  );
}
