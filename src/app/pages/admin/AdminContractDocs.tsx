import { useState, useEffect } from "react";
import { FileText, FileCheck, Receipt, Download, Loader2, Building2, Hash, Plus, Trash2, Eye, Mail } from "lucide-react";
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

  // 분야별 별표 (단가표/산정표)
  const [personalRates, setPersonalRates] = useState<Array<{ jobCategory: string; ratePerHour: number; headcount: number }>>([
    { jobCategory: "제조/생산", ratePerHour: 15000, headcount: 1 },
  ]);
  const [personalDetails, setPersonalDetails] = useState({
    headcount: 5, workHoursPerDay: 8, workDaysPerWeek: 5, siteManager: "",
  });
  const [productionRates, setProductionRates] = useState<Array<{ productSpec: string; unitRate: number; quantity?: number }>>([
    { productSpec: "기본 사양", unitRate: 1000, quantity: 100 },
  ]);
  const [productionDetailsForm, setProductionDetailsForm] = useState({
    productName: "", targetQuantity: 1000, qualityStandard: "협의된 사양에 따름",
  });
  const [dispatchDetailsForm, setDispatchDetailsForm] = useState({
    workTime: "09:00 ~ 18:00", restTime: "12:00 ~ 13:00", holiday: "주말 및 공휴일",
    dispatchFee: 0, workerWage: 0,
    userManagerName: "", safetyManager: "",
  });

  // 미리보기 모달
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  // 이메일 발송 모달
  const [emailModal, setEmailModal] = useState<{ blob: Blob; fileName: string; html: string } | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

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

  // 계약서 데이터 빌더
  const buildContractData = (client: ClientInfo): ContractData => ({
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
        ...personalDetails,
        siteManager: personalDetails.siteManager || company.ceoName,
        rateTable: personalRates,
      },
    }),
    ...(contractType === "PRODUCTION_OUTSOURCING" && {
      productionDetails: {
        ...productionDetailsForm,
        rateTable: productionRates,
      },
    }),
    ...(contractType === "DISPATCH" && {
      dispatchDetails: {
        dispatchPeriod: `${contractForm.startDate} ~ ${contractForm.endDate}`,
        ...dispatchDetailsForm,
        userBusinessName: client.name,
        safetyManager: dispatchDetailsForm.safetyManager || company.ceoName,
      },
    }),
  });

  // 계약서 발행
  const handleGenerateContract = async (mode: "preview" | "download" | "email" = "download") => {
    const client = getClient();
    if (!client) { handleError(new Error("파트너사를 선택해주세요.")); return; }

    setGenerating(true);
    try {
      const data = buildContractData(client);
      const html = renderContract(data, company, client);
      if (mode === "preview") {
        setPreviewHTML(html);
        return;
      }
      const blob = await generatePDFFromHTML(html, "");
      const fileName = `${CONTRACT_TYPE_LABEL[contractType]}_계약서_${client.name}_${data.contractDate}.pdf`;
      if (mode === "email") {
        setEmailModal({ blob, fileName, html });
        return;
      }
      downloadPDF(blob, fileName);
      handleSuccess("계약서가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "계약서 발행 실패" });
    } finally { setGenerating(false); }
  };

  // 청구서 데이터 빌더 (자동 단가표 연동)
  const buildInvoiceData = async (billing: any, clientInfo: ClientInfo): Promise<InvoiceData> => {
    // 단가 마스터 자동 연동 → 직무별 항목 분리
    let items: InvoiceData["items"] = [];
    try {
      const ratesAll = await api.settlementApi.billingRates.list();
      const ratesArr: any[] = Array.isArray(ratesAll) ? ratesAll : [];
      const clientRates = ratesArr.filter((r: any) => r.client_company_id === billing.client_company_id);
      // 출퇴근 → 직무별 시간 집계 시도
      const attAll = await api.erpApi.attendance.list().catch(() => []);
      const placAll = await api.erpApi.placements.list().catch(() => []);
      const empAll = await api.erpApi.clientCompanies.list().catch(() => []);
      const allEmployees: any[] = await api.employees.list().catch(() => []) as any;
      const placByClient = (Array.isArray(placAll) ? placAll : []).filter((p: any) => p.client_company_id === billing.client_company_id);
      const placIds = new Set(placByClient.map((p: any) => p.id));
      const monthAtt = (Array.isArray(attAll) ? attAll : []).filter((a: any) => a.date?.startsWith(billing.year_month) && placIds.has(a.placement_id));
      // 직무별 집계
      const byCategory = new Map<string, { hours: number; rate: number }>();
      for (const att of monthAtt) {
        const placement = placByClient.find((p: any) => p.id === att.placement_id);
        const employee = allEmployees.find((e: any) => e.id === placement?.employee_id);
        const cat = employee?.job_category || placement?.job_category || "기타";
        const rate = clientRates.find((r: any) => r.job_category === cat);
        const hours = Number(att.work_hours) || 8;
        const cur = byCategory.get(cat) || { hours: 0, rate: Number(rate?.client_rate_per_hour) || 0 };
        cur.hours += hours;
        byCategory.set(cat, cur);
      }
      if (byCategory.size > 0) {
        items = Array.from(byCategory.entries()).map(([cat, v]) => ({
          description: contractType === "PERSONAL_OUTSOURCING" ? `${billing.year_month} ${cat} 도급용역`
            : contractType === "PRODUCTION_OUTSOURCING" ? `${billing.year_month} ${cat} 생산도급`
            : `${billing.year_month} ${cat} 파견용역`,
          quantity: v.hours,
          unit: contractType === "PRODUCTION_OUTSOURCING" ? "개" : "시간",
          unitPrice: v.rate,
          amount: v.hours * v.rate,
        }));
      }
    } catch { /* fallback 사용 */ }

    if (items.length === 0) {
      items = [{
        description: contractType === "PERSONAL_OUTSOURCING" ? `${billing.year_month} 인력 도급용역료`
          : contractType === "PRODUCTION_OUTSOURCING" ? `${billing.year_month} 생산 도급용역료`
          : `${billing.year_month} 파견근로자 인건비 및 수수료`,
        quantity: billing.total_hours || 0,
        unit: contractType === "PRODUCTION_OUTSOURCING" ? "개" : "시간",
        unitPrice: billing.total_hours > 0 ? Math.round(billing.total_amount / billing.total_hours) : 0,
        amount: billing.total_amount || 0,
      }];
    }

    return {
      contractType,
      invoiceNo: `INV-${billing.year_month.replace("-", "")}-${String(billing.id).slice(0, 4)}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      yearMonth: billing.year_month,
      dueDate: companyInfo?.payment_due_date || "익월 10일",
      items,
      subtotal: billing.total_amount || 0,
      vatAmount: billing.vat_amount || 0,
      total: billing.final_amount || 0,
      ...(contractType === "DISPATCH" && {
        dispatchBreakdown: {
          wageAmount: Math.round((billing.total_amount || 0) * 0.85),
          feeAmount: Math.round((billing.total_amount || 0) * 0.15),
        },
      }),
      bankInfo: {
        bankName: companyInfo?.bank_name || "신한은행",
        accountNumber: companyInfo?.bank_account || "000-000-000000",
        accountHolder: companyInfo?.bank_holder || company.name,
      },
    };
  };

  // 청구서 발행
  const handleGenerateInvoice = async (mode: "preview" | "download" | "email" = "download") => {
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
      const data = await buildInvoiceData(billing, clientInfo);
      const html = renderInvoice(data, company, clientInfo);
      if (mode === "preview") { setPreviewHTML(html); return; }
      const blob = await generatePDFFromHTML(html, "");
      const fileName = `청구서_${clientInfo.name}_${billing.year_month}.pdf`;
      if (mode === "email") { setEmailModal({ blob, fileName, html }); return; }
      downloadPDF(blob, fileName);
      handleSuccess("청구서가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "청구서 발행 실패" });
    } finally { setGenerating(false); }
  };

  // 세금계산서 발행
  const handleGenerateTaxInvoice = async (mode: "preview" | "download" | "email" = "download") => {
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
      if (mode === "preview") { setPreviewHTML(html); return; }
      const blob = await generatePDFFromHTML(html, "");
      const fileName = `세금계산서_${clientInfo.name}_${billing.year_month}.pdf`;
      if (mode === "email") { setEmailModal({ blob, fileName, html }); return; }
      downloadPDF(blob, fileName);
      handleSuccess("세금계산서가 발행되었습니다.");
    } catch (e: any) {
      handleError(e, { fallback: "세금계산서 발행 실패" });
    } finally { setGenerating(false); }
  };

  // 이메일 발송 (mailto: 백업 + 서버 API 시도)
  const handleSendEmail = async () => {
    if (!emailModal || !emailRecipient) {
      handleError(new Error("수신자 이메일을 입력해주세요."));
      return;
    }
    try {
      // 1. 서버 API 호출 시도
      const formData = new FormData();
      formData.append("to", emailRecipient);
      formData.append("subject", `[${company.name}] ${emailModal.fileName.replace(".pdf", "")}`);
      formData.append("body", emailMessage || "첨부된 양식을 확인해주세요.");
      formData.append("attachment", emailModal.blob, emailModal.fileName);
      // 서버 API 미구현 시 대비 - mailto 링크로 폴백
      const subject = encodeURIComponent(`[${company.name}] ${emailModal.fileName.replace(".pdf", "")}`);
      const body = encodeURIComponent(`${emailMessage}\n\n첨부 파일: ${emailModal.fileName}\n(파일은 별도로 첨부됩니다)`);
      window.open(`mailto:${emailRecipient}?subject=${subject}&body=${body}`);
      // PDF 자동 다운로드 (이메일 첨부용)
      downloadPDF(emailModal.blob, emailModal.fileName);
      handleSuccess("메일 클라이언트가 열렸습니다. PDF를 첨부해 발송해주세요.");
      setEmailModal(null);
      setEmailRecipient("");
      setEmailMessage("");
    } catch (e: any) {
      handleError(e, { fallback: "이메일 발송 실패" });
    }
  };

  // 별표 행 추가/삭제
  const addPersonalRate = () => setPersonalRates([...personalRates, { jobCategory: "제조/생산", ratePerHour: 15000, headcount: 1 }]);
  const removePersonalRate = (i: number) => setPersonalRates(personalRates.filter((_, idx) => idx !== i));
  const updatePersonalRate = (i: number, key: string, val: any) => {
    const next = [...personalRates];
    (next[i] as any)[key] = val;
    setPersonalRates(next);
  };
  const addProductionRate = () => setProductionRates([...productionRates, { productSpec: "", unitRate: 0, quantity: 0 }]);
  const removeProductionRate = (i: number) => setProductionRates(productionRates.filter((_, idx) => idx !== i));
  const updateProductionRate = (i: number, key: string, val: any) => {
    const next = [...productionRates];
    (next[i] as any)[key] = val;
    setProductionRates(next);
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

          {/* 분야별 별표 (단가표/산정표) */}
          {contractType === "PERSONAL_OUTSOURCING" && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
              <div className="text-sm font-bold text-[var(--brand-navy)]">[별표] 인적 도급 산정표</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">총 투입 인원</label>
                  <input type="number" value={personalDetails.headcount} onChange={(e) => setPersonalDetails({ ...personalDetails, headcount: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">일 근로시간</label>
                  <input type="number" value={personalDetails.workHoursPerDay} onChange={(e) => setPersonalDetails({ ...personalDetails, workHoursPerDay: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">주 근로일</label>
                  <input type="number" value={personalDetails.workDaysPerWeek} onChange={(e) => setPersonalDetails({ ...personalDetails, workDaysPerWeek: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">현장 책임자 (도급사 측, 위장도급 방지)</label>
                <input type="text" value={personalDetails.siteManager} onChange={(e) => setPersonalDetails({ ...personalDetails, siteManager: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="예: 김철수" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500">직무별 단가</label>
                  <button onClick={addPersonalRate} className="text-xs text-blue-600 flex items-center gap-1"><Plus size={12} /> 추가</button>
                </div>
                {personalRates.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <input type="text" value={r.jobCategory} onChange={(e) => updatePersonalRate(i, "jobCategory", e.target.value)} placeholder="직무" className="col-span-5 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                    <input type="number" value={r.ratePerHour} onChange={(e) => updatePersonalRate(i, "ratePerHour", Number(e.target.value))} placeholder="시간당 단가" className="col-span-3 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                    <input type="number" value={r.headcount} onChange={(e) => updatePersonalRate(i, "headcount", Number(e.target.value))} placeholder="인원" className="col-span-3 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                    <button onClick={() => removePersonalRate(i)} className="col-span-1 text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contractType === "PRODUCTION_OUTSOURCING" && (
            <div className="bg-green-50 rounded-xl p-4 space-y-3 border border-green-100">
              <div className="text-sm font-bold text-[var(--brand-navy)]">[별표] 생산 도급 단가표</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">생산 제품명</label>
                  <input type="text" value={productionDetailsForm.productName} onChange={(e) => setProductionDetailsForm({ ...productionDetailsForm, productName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">목표 수량</label>
                  <input type="number" value={productionDetailsForm.targetQuantity} onChange={(e) => setProductionDetailsForm({ ...productionDetailsForm, targetQuantity: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">품질 기준</label>
                <input type="text" value={productionDetailsForm.qualityStandard} onChange={(e) => setProductionDetailsForm({ ...productionDetailsForm, qualityStandard: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500">규격별 단가 (개당)</label>
                  <button onClick={addProductionRate} className="text-xs text-green-600 flex items-center gap-1"><Plus size={12} /> 추가</button>
                </div>
                {productionRates.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <input type="text" value={r.productSpec} onChange={(e) => updateProductionRate(i, "productSpec", e.target.value)} placeholder="규격/사양" className="col-span-5 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                    <input type="number" value={r.unitRate} onChange={(e) => updateProductionRate(i, "unitRate", Number(e.target.value))} placeholder="개당 단가" className="col-span-3 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                    <input type="number" value={r.quantity || 0} onChange={(e) => updateProductionRate(i, "quantity", Number(e.target.value))} placeholder="예상 수량" className="col-span-3 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                    <button onClick={() => removeProductionRate(i)} className="col-span-1 text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contractType === "DISPATCH" && (
            <div className="bg-orange-50 rounded-xl p-4 space-y-3 border border-orange-100">
              <div className="text-sm font-bold text-[var(--brand-navy)]">[별표] 파견 정보 (파견법 제20조)</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">시업·종업 시각</label>
                  <input type="text" value={dispatchDetailsForm.workTime} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, workTime: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">휴게시간</label>
                  <input type="text" value={dispatchDetailsForm.restTime} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, restTime: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">휴일</label>
                  <input type="text" value={dispatchDetailsForm.holiday} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, holiday: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">파견 수수료 (월)</label>
                  <input type="number" value={dispatchDetailsForm.dispatchFee} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, dispatchFee: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">파견근로자 임금 (월)</label>
                  <input type="number" value={dispatchDetailsForm.workerWage} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, workerWage: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">사용사업주 측 관리자</label>
                  <input type="text" value={dispatchDetailsForm.userManagerName} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, userManagerName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">안전보건책임자</label>
                  <input type="text" value={dispatchDetailsForm.safetyManager} onChange={(e) => setDispatchDetailsForm({ ...dispatchDetailsForm, safetyManager: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="기본값: 대표이사" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button onClick={() => handleGenerateContract("preview")} disabled={generating || !selectedClient} className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-50 hover:bg-gray-50">
              <Eye size={14} /> 미리보기
            </button>
            <button onClick={() => handleGenerateContract("download")} disabled={generating || !selectedClient} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--brand-blue)] text-white text-sm font-semibold disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />} PDF 다운로드
            </button>
            <button onClick={() => handleGenerateContract("email")} disabled={generating || !selectedClient} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
              <Mail size={14} /> 이메일 발송
            </button>
          </div>
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
            <p className="text-xs text-gray-400 mt-2">※ 청구서는 "정산 관리 → 고객사 청구"에서 먼저 생성해야 합니다. 단가 마스터 등록 시 직무별 자동 분리됩니다.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button onClick={() => (docType === "invoice" ? handleGenerateInvoice("preview") : handleGenerateTaxInvoice("preview"))} disabled={generating || !selectedBilling} className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-50 hover:bg-gray-50">
              <Eye size={14} /> 미리보기
            </button>
            <button onClick={() => (docType === "invoice" ? handleGenerateInvoice("download") : handleGenerateTaxInvoice("download"))} disabled={generating || !selectedBilling} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--brand-blue)] text-white text-sm font-semibold disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />} PDF 다운로드
            </button>
            <button onClick={() => (docType === "invoice" ? handleGenerateInvoice("email") : handleGenerateTaxInvoice("email"))} disabled={generating || !selectedBilling} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
              <Mail size={14} /> 이메일 발송
            </button>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {previewHTML && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewHTML(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-3 border-b">
              <h3 className="text-lg font-bold text-[var(--brand-navy)]">미리보기</h3>
              <button onClick={() => setPreviewHTML(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: previewHTML }} />
          </div>
        </div>
      )}

      {/* 이메일 발송 모달 */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEmailModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--brand-navy)] mb-4">이메일 발송</h3>
            <p className="text-xs text-gray-500 mb-4">파일: {emailModal.fileName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">수신자 이메일 *</label>
                <input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="example@email.com" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">메시지</label>
                <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={4} placeholder="첨부된 양식을 확인 부탁드립니다." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEmailModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">취소</button>
              <button onClick={handleSendEmail} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                <Mail size={14} /> 메일 클라이언트 열기
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">※ 메일 클라이언트가 열리고 PDF가 다운로드됩니다. PDF를 메일에 첨부 후 발송해주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
