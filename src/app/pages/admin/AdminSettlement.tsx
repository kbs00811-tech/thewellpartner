import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Loader2, FileText, TrendingUp, DollarSign, Building2, RefreshCw, CheckCircle2, FileCheck, Send, Search } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { JOB_CATEGORIES } from "../../constants";

type Tab = "rates" | "billings" | "settlements";

interface BillingRate {
  id: string;
  client_company_id: string;
  client_company_name?: string;
  job_category: string;
  client_rate_per_hour: number;
  worker_rate_per_hour: number;
  margin_rate?: number;
  effective_from: string;
  effective_to?: string;
}

interface PartnerBilling {
  id: string;
  client_company_id: string;
  client_company_name?: string;
  year_month: string;
  total_hours: number;
  total_amount: number;
  vat_amount: number;
  final_amount: number;
  status: "DRAFT" | "ISSUED" | "PAID";
  issued_at?: string;
  paid_at?: string;
}

interface Settlement {
  id: string;
  year_month: string;
  client_company_id: string;
  client_company_name?: string;
  revenue: number;
  worker_cost: number;
  insurance_cost: number;
  net_margin: number;
  margin_rate: number;
}

export default function AdminSettlement() {
  const [tab, setTab] = useState<Tab>("rates");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [rates, setRates] = useState<BillingRate[]>([]);
  const [billings, setBillings] = useState<PartnerBilling[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<BillingRate> | null>(null);

  // 데이터 로드
  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientRes, rateRes, billRes, settleRes] = await Promise.all([
        api.erpApi.clientCompanies.list().catch(() => []),
        api.settlementApi.billingRates.list().catch(() => []),
        api.settlementApi.partnerBillings.list().catch(() => []),
        api.settlementApi.settlements.list().catch(() => []),
      ]);
      const clientList = Array.isArray(clientRes) ? clientRes : [];
      setClients(clientList);
      const clientMap = new Map(clientList.map((c: any) => [c.id, c.name || c.company_name]));
      setRates((Array.isArray(rateRes) ? rateRes : []).map((r: BillingRate) => ({
        ...r,
        client_company_name: clientMap.get(r.client_company_id) || "—",
        margin_rate: r.client_rate_per_hour > 0 ? ((r.client_rate_per_hour - r.worker_rate_per_hour) / r.client_rate_per_hour) * 100 : 0,
      })));
      setBillings((Array.isArray(billRes) ? billRes : []).map((b: PartnerBilling) => ({
        ...b, client_company_name: clientMap.get(b.client_company_id) || "—",
      })));
      setSettlements((Array.isArray(settleRes) ? settleRes : []).map((s: Settlement) => ({
        ...s, client_company_name: clientMap.get(s.client_company_id) || "—",
      })));
    } catch (e: any) {
      handleError(e, { fallback: "정산 데이터를 불러오지 못했습니다." });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // 단가 저장
  const handleSaveRate = async () => {
    if (!editing?.client_company_id || !editing?.job_category) {
      handleError(new Error("필수 항목을 입력해주세요."));
      return;
    }
    try {
      const payload = {
        client_company_id: editing.client_company_id,
        job_category: editing.job_category,
        client_rate_per_hour: Number(editing.client_rate_per_hour) || 0,
        worker_rate_per_hour: Number(editing.worker_rate_per_hour) || 0,
        effective_from: editing.effective_from || new Date().toISOString().split("T")[0],
        effective_to: editing.effective_to || null,
      };
      if (editing.id) {
        await api.settlementApi.billingRates.update(editing.id, payload);
        handleSuccess("단가가 수정되었습니다.");
      } else {
        await api.settlementApi.billingRates.create(payload);
        handleSuccess("단가가 등록되었습니다.");
      }
      setEditing(null);
      loadAll();
    } catch (e: any) {
      handleError(e, { fallback: "저장 실패" });
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.settlementApi.billingRates.remove(id);
      handleSuccess("삭제되었습니다.");
      loadAll();
    } catch (e: any) { handleError(e, { fallback: "삭제 실패" }); }
  };

  // 청구서 자동 생성
  const handleGenerateBilling = async (clientId: string) => {
    try {
      await api.settlementApi.partnerBillings.generate({ clientCompanyId: clientId, yearMonth });
      handleSuccess(`${yearMonth} 청구서가 생성되었습니다.`);
      loadAll();
    } catch (e: any) { handleError(e, { fallback: "청구서 생성 실패" }); }
  };

  const handleIssueBilling = async (id: string) => {
    try {
      await api.settlementApi.partnerBillings.issue(id);
      handleSuccess("청구서가 발행되었습니다.");
      loadAll();
    } catch (e: any) { handleError(e, { fallback: "발행 실패" }); }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await api.settlementApi.partnerBillings.markPaid(id);
      handleSuccess("입금 완료 처리되었습니다.");
      loadAll();
    } catch (e: any) { handleError(e, { fallback: "처리 실패" }); }
  };

  // 필터링
  const filteredRates = useMemo(() => {
    if (!search) return rates;
    const q = search.toLowerCase();
    return rates.filter((r) =>
      (r.client_company_name || "").toLowerCase().includes(q) ||
      r.job_category.toLowerCase().includes(q)
    );
  }, [rates, search]);

  const monthBillings = useMemo(() => billings.filter((b) => b.year_month === yearMonth), [billings, yearMonth]);
  const monthSettlements = useMemo(() => settlements.filter((s) => s.year_month === yearMonth), [settlements, yearMonth]);

  // 요약 통계
  const summary = useMemo(() => {
    const totalRevenue = monthSettlements.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const totalCost = monthSettlements.reduce((sum, s) => sum + (s.worker_cost || 0) + (s.insurance_cost || 0), 0);
    const totalMargin = monthSettlements.reduce((sum, s) => sum + (s.net_margin || 0), 0);
    const avgMarginRate = monthSettlements.length > 0
      ? monthSettlements.reduce((sum, s) => sum + (s.margin_rate || 0), 0) / monthSettlements.length
      : 0;
    return { totalRevenue, totalCost, totalMargin, avgMarginRate };
  }, [monthSettlements]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--brand-navy)]">정산 관리</h1>
        <p className="text-sm text-gray-500 mt-1">파트너사별 단가, 청구, 마진 정산을 통합 관리합니다.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={18} className="text-blue-500" />
            <span className="text-xs text-gray-400">{yearMonth}</span>
          </div>
          <div className="text-xs text-gray-500 mb-1">총 매출</div>
          <div className="text-xl font-bold text-[var(--brand-navy)]">{summary.totalRevenue.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={18} className="text-orange-500" />
            <span className="text-xs text-gray-400">{yearMonth}</span>
          </div>
          <div className="text-xs text-gray-500 mb-1">총 원가</div>
          <div className="text-xl font-bold text-[var(--brand-navy)]">{summary.totalCost.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-xs text-gray-400">{yearMonth}</span>
          </div>
          <div className="text-xs text-gray-500 mb-1">순 마진</div>
          <div className="text-xl font-bold text-green-600">{summary.totalMargin.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Building2 size={18} className="text-purple-500" />
            <span className="text-xs text-gray-400">평균</span>
          </div>
          <div className="text-xs text-gray-500 mb-1">마진율</div>
          <div className="text-xl font-bold text-purple-600">{summary.avgMarginRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[
          { key: "rates", label: "단가 마스터", icon: DollarSign },
          { key: "billings", label: "고객사 청구", icon: FileText },
          { key: "settlements", label: "마진 정산", icon: TrendingUp },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-[var(--brand-blue)] border-b-2 border-[var(--brand-blue)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm self-center"
        />
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 self-center"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {/* Tab Content */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> 로딩중...
        </div>
      )}

      {/* Tab: 단가 마스터 */}
      {!loading && tab === "rates" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="파트너사 또는 직무 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm flex-1 outline-none"
              />
            </div>
            <button
              onClick={() => setEditing({ effective_from: new Date().toISOString().split("T")[0] })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-blue)] text-white text-sm font-semibold hover:bg-[var(--brand-blue)]/90"
            >
              <Plus size={15} /> 단가 등록
            </button>
          </div>

          {editing && (
            <div className="bg-blue-50 rounded-2xl p-5 mb-5 border border-blue-100">
              <h3 className="text-sm font-bold mb-4 text-[var(--brand-navy)]">{editing.id ? "단가 수정" : "단가 등록"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">파트너사 *</label>
                  <select
                    value={editing.client_company_id || ""}
                    onChange={(e) => setEditing({ ...editing, client_company_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    <option value="">선택</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name || c.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">직무 *</label>
                  <select
                    value={editing.job_category || ""}
                    onChange={(e) => setEditing({ ...editing, job_category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    <option value="">선택</option>
                    {JOB_CATEGORIES.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">적용 시작일</label>
                  <input
                    type="date"
                    value={editing.effective_from || ""}
                    onChange={(e) => setEditing({ ...editing, effective_from: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">고객사 단가 (시급)</label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={editing.client_rate_per_hour || ""}
                    onChange={(e) => setEditing({ ...editing, client_rate_per_hour: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">근로자 단가 (시급)</label>
                  <input
                    type="number"
                    placeholder="12000"
                    value={editing.worker_rate_per_hour || ""}
                    onChange={(e) => setEditing({ ...editing, worker_rate_per_hour: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">예상 마진율</label>
                  <div className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-purple-600 font-semibold">
                    {editing.client_rate_per_hour && editing.worker_rate_per_hour
                      ? `${(((Number(editing.client_rate_per_hour) - Number(editing.worker_rate_per_hour)) / Number(editing.client_rate_per_hour)) * 100).toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveRate} className="px-5 py-2 rounded-xl bg-[var(--brand-blue)] text-white text-sm font-semibold">저장</button>
                <button onClick={() => setEditing(null)} className="px-5 py-2 rounded-xl border border-gray-200 text-sm">취소</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">파트너사</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">직무</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">고객사 단가</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">근로자 단가</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">마진율</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">적용일</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">등록된 단가가 없습니다.</td></tr>
                ) : filteredRates.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">{r.client_company_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.job_category}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{r.client_rate_per_hour.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.worker_rate_per_hour.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-600">{(r.margin_rate || 0).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.effective_from}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(r)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg mr-1"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteRate(r.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: 청구서 */}
      {!loading && tab === "billings" && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-sm text-gray-500">{yearMonth} 청구서가 없는 파트너사:</span>
            {clients.filter((c: any) => !monthBillings.find((b) => b.client_company_id === c.id)).slice(0, 5).map((c: any) => (
              <button
                key={c.id}
                onClick={() => handleGenerateBilling(c.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--brand-sky)] text-[var(--brand-blue)] font-medium hover:bg-[var(--brand-blue)] hover:text-white"
              >
                + {c.name || c.company_name}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">파트너사</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">총 시간</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">공급가액</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">부가세</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">청구액</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody>
                {monthBillings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{yearMonth} 청구서가 없습니다.</td></tr>
                ) : monthBillings.map((b) => (
                  <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">{b.client_company_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{(b.total_hours || 0).toLocaleString()}h</td>
                    <td className="px-4 py-3 text-right text-gray-600">{(b.total_amount || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-gray-500">{(b.vat_amount || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{(b.final_amount || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === "PAID" ? "bg-green-50 text-green-600"
                        : b.status === "ISSUED" ? "bg-blue-50 text-blue-600"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {b.status === "PAID" ? "입금완료" : b.status === "ISSUED" ? "발행" : "초안"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status === "DRAFT" && (
                        <button onClick={() => handleIssueBilling(b.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 mr-1">
                          <Send size={12} /> 발행
                        </button>
                      )}
                      {b.status === "ISSUED" && (
                        <button onClick={() => handleMarkPaid(b.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-green-50 text-green-600 hover:bg-green-100">
                          <FileCheck size={12} /> 입금확인
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: 정산 */}
      {!loading && tab === "settlements" && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">파트너사</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">매출</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">근로자 임금</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">4대보험(사업주)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">순마진</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">마진율</th>
                </tr>
              </thead>
              <tbody>
                {monthSettlements.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">{yearMonth} 정산 내역이 없습니다.</td></tr>
                ) : monthSettlements.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">{s.client_company_name}</td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">{(s.revenue || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-orange-600">{(s.worker_cost || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-orange-500">{(s.insurance_cost || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{(s.net_margin || 0).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-600">{(s.margin_rate || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
