import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import {
  Search, Plus, Globe2, AlertTriangle, ShieldCheck, ShieldX, Clock, Users,
  Loader2, X, Eye, Edit, Trash2, FileText, CalendarClock, MapPin, Flag,
  ChevronRight, RefreshCw, Bell,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

const VISA_TYPES = ["E-9", "E-7", "H-2", "F-2-R", "D-2", "D-10", "F-4", "F-5", "F-6"];
const STAY_STATUSES: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  ACTIVE: { label: "정상 체류", bg: "rgba(15,157,88,0.1)", text: "#0f9d58", icon: ShieldCheck },
  EXPIRING_SOON: { label: "만료 임박", bg: "rgba(245,158,11,0.1)", text: "#f59e0b", icon: AlertTriangle },
  EXPIRED: { label: "만료됨", bg: "rgba(230,57,70,0.1)", text: "#e63946", icon: ShieldX },
};
const ACTION_TYPES: Record<string, { label: string; color: string }> = {
  ENTRY: { label: "입국", color: "#0f9d58" },
  RENEWAL: { label: "갱신", color: "#2a7de1" },
  STATUS_CHECK: { label: "상태확인", color: "#f59e0b" },
  EXPIRED: { label: "만료", color: "#e63946" },
  EXIT: { label: "출국", color: "#8b95a5" },
  VISA_CHANGE: { label: "비자변경", color: "#8b5cf6" },
};
const PIE_COLORS = ["#1e56a0", "#2a7de1", "#0f9d58", "#8b5cf6", "#f59e0b", "#e63946", "#8b95a5", "#06b6d4"];

type Tab = "dashboard" | "visas" | "stay";

export default function AdminForeign() {
  const location = useLocation();
  const getTab = (): Tab => {
    if (location.pathname.includes("stay")) return "stay";
    if (location.pathname.includes("visa")) return "visas";
    return "dashboard";
  };
  const [activeTab, setActiveTab] = useState<Tab>(getTab());
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<any>({});
  const [visas, setVisas] = useState<any[]>([]);
  const [stayRecords, setStayRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visaTypeFilter, setVisaTypeFilter] = useState("all");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Stay form
  const [showStayForm, setShowStayForm] = useState(false);
  const [stayFormData, setStayFormData] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, v, s] = await Promise.all([
        api.erpApi.getForeignDashboard(),
        api.erpApi.visas.list(),
        api.erpApi.stayRecords.list(),
      ]);
      setDash(d);
      setVisas((Array.isArray(v) ? v : []).sort((a: any, b: any) => (a.expire_date || "").localeCompare(b.expire_date || "")));
      setStayRecords((Array.isArray(s) ? s : []).sort((a: any, b: any) => (b.action_date || "").localeCompare(a.action_date || "")));
    } catch (e) { handleError(e, { fallback: "외국인 인력 데이터를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const getDaysUntilExpiry = (date: string) => {
    if (!date) return 999;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleSaveVisa = async () => {
    if (!formData.employee_name || !formData.visa_type) return;
    setSaving(true);
    try {
      if (editId) {
        await api.erpApi.visas.update(editId, { ...formData, updated_at: new Date().toISOString() });
      } else {
        await api.erpApi.visas.create({
          ...formData,
          stay_status: "ACTIVE",
          renewal_count: 0,
        });
      }
      setShowForm(false);
      setFormData({});
      setEditId(null);
      handleSuccess(editId ? "비자 정보가 수정되었습니다." : "비자가 등록되었습니다.");
      await loadAll();
    } catch (e) { handleError(e, { fallback: "비자 정보 저장에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleDeleteVisa = async (id: string) => {
    if (!confirm("비자 정보를 삭제하시겠습니까?")) return;
    try {
      await api.erpApi.visas.remove(id);
      handleSuccess("비자 정보가 삭제되었습니다.");
      await loadAll();
    } catch (e) { handleError(e, { fallback: "비자 삭제에 실패했습니다." }); }
  };

  const handleSaveStay = async () => {
    if (!stayFormData.visa_id || !stayFormData.action_type) return;
    setSaving(true);
    try {
      const visa = visas.find(v => v.id === stayFormData.visa_id);
      await api.erpApi.stayRecords.create({
        ...stayFormData,
        employee_name: visa?.employee_name || "",
        action_date: stayFormData.action_date || new Date().toISOString().split("T")[0],
      });
      // Update visa status if applicable
      if (stayFormData.stay_status_after && visa) {
        await api.erpApi.visas.update(visa.id, { stay_status: stayFormData.stay_status_after });
      }
      setShowStayForm(false);
      setStayFormData({});
      handleSuccess("체류 기록이 저장되었습니다.");
      await loadAll();
    } catch (e) { handleError(e, { fallback: "체류 기록 저장에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const toChartData = (obj: Record<string, number> | undefined) => {
    if (!obj) return [];
    return Object.entries(obj).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  };

  const filteredVisas = visas.filter(v => {
    const matchSearch = !searchTerm || (v.employee_name || "").includes(searchTerm) || (v.visa_no || "").includes(searchTerm) || (v.nationality || "").includes(searchTerm);
    const matchStatus = statusFilter === "all" || v.stay_status === statusFilter;
    const matchType = visaTypeFilter === "all" || v.visa_type === visaTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  const TABS = [
    { key: "dashboard" as const, label: "현황 대시보드", icon: Globe2 },
    { key: "visas" as const, label: "비자 관리", icon: FileText },
    { key: "stay" as const, label: "체류 기록", icon: CalendarClock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>외국인 인력관리</h1>
          <p className="text-sm text-gray-400 mt-1">비자·체류 현황 관리 및 만료 알림</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "visas" && (
            <button onClick={() => { setShowForm(!showForm); setEditId(null); setFormData({}); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25" style={{ backgroundColor: "var(--brand-blue)" }}>
              <Plus size={16} />비자 등록
            </button>
          )}
          {activeTab === "stay" && (
            <button onClick={() => { setShowStayForm(!showStayForm); setStayFormData({}); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25" style={{ backgroundColor: "var(--brand-blue)" }}>
              <Plus size={16} />기록 추가
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl max-w-2xl">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearchTerm(""); setStatusFilter("all"); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeTab === tab.key ? { color: "var(--brand-navy)" } : {}}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* ══════ Dashboard ══════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "전체 외국인", value: dash.totalForeign || 0, color: "#1e56a0", icon: Users },
              { label: "정상 체류", value: dash.activeVisas || 0, color: "#0f9d58", icon: ShieldCheck },
              { label: "만료 임박 (90일)", value: dash.expiringSoon || 0, color: "#f59e0b", icon: AlertTriangle },
              { label: "만료됨", value: dash.expired || 0, color: "#e63946", icon: ShieldX },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400">{kpi.label}</div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                    <kpi.icon size={16} style={{ color: kpi.color }} />
                  </div>
                </div>
                <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Expiry Alert Bars */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} style={{ color: "var(--brand-blue)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>만료 임박 알림</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "30일 이내", value: dash.expiringIn30 || 0, color: "#e63946" },
                { label: "60일 이내", value: dash.expiringIn60 || 0, color: "#f59e0b" },
                { label: "90일 이내", value: dash.expiringIn90 || 0, color: "#2a7de1" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: `${item.color}10` }}>
                  <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-xs font-medium mt-1" style={{ color: item.color }}>{item.label}</div>
                </div>
              ))}
            </div>
            {/* Alert List */}
            {(dash.alertList || []).length > 0 ? (
              <div className="space-y-2">
                {(dash.alertList || []).slice(0, 6).map((v: any) => {
                  const days = getDaysUntilExpiry(v.expire_date);
                  const isExpired = days <= 0;
                  return (
                    <div key={v.id} className={`flex items-center gap-3 p-3 rounded-xl text-sm ${isExpired ? "bg-red-50" : "bg-amber-50"}`}>
                      {isExpired ? <ShieldX size={16} className="text-red-500 flex-shrink-0" /> : <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold" style={{ color: "var(--brand-navy)" }}>{v.employee_name}</span>
                        <span className="text-gray-400 ml-2">{v.visa_type} · {v.nationality}</span>
                      </div>
                      <div className="text-xs font-semibold flex-shrink-0" style={{ color: isExpired ? "#e63946" : "#f59e0b" }}>
                        {isExpired ? `${Math.abs(days)}일 초과` : `D-${days}`}
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">{v.expire_date}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">현재 만료 임박 인원이 없습니다.</div>
            )}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>비자 유형별 분포</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={toChartData(dash.byVisaType)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {toChartData(dash.byVisaType).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {toChartData(dash.byVisaType).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-500">{item.name}</span>
                    <span className="font-semibold ml-auto">{item.value}명</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>국적별 분포</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={toChartData(dash.byNationality)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {toChartData(dash.byNationality).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {toChartData(dash.byNationality).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-500">{item.name}</span>
                    <span className="font-semibold ml-auto">{item.value}명</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Stay Records */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>최근 체류 기록</h3>
            <div className="space-y-2">
              {(dash.recentStayRecords || []).slice(0, 5).map((r: any) => {
                const at = ACTION_TYPES[r.action_type] || { label: r.action_type, color: "#8b95a5" };
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: at.color }} />
                    <span className="font-semibold" style={{ color: "var(--brand-navy)" }}>{r.employee_name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: `${at.color}15`, color: at.color }}>{at.label}</span>
                    <span className="text-gray-400 text-xs flex-1">{r.note}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{r.action_date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════ Visa Management ══════ */}
      {activeTab === "visas" && (
        <>
          {/* Visa Form */}
          {showForm && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{editId ? "비자 정보 수정" : "신규 비자 등록"}</h3>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "employee_name", label: "이름", placeholder: "Nguyen Van A" },
                  { key: "employee_no", label: "사번/관리번호", placeholder: "EMP-008" },
                  { key: "nationality", label: "국적", placeholder: "베트남" },
                  { key: "passport_no", label: "여권번호", placeholder: "B12345678" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={formData[f.key] ?? ""} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">비자 유형</label>
                  <select value={formData.visa_type || ""} onChange={e => setFormData({ ...formData, visa_type: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]">
                    <option value="">선택</option>
                    {VISA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">비자번호</label>
                  <input type="text" placeholder="V2024-00001" value={formData.visa_no || ""} onChange={e => setFormData({ ...formData, visa_no: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">발급일</label>
                  <input type="date" value={formData.issue_date || ""} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">만료일</label>
                  <input type="date" value={formData.expire_date || ""} onChange={e => setFormData({ ...formData, expire_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">발급기관</label>
                  <input type="text" placeholder="수원출입국관리사무소" value={formData.issue_authority || ""} onChange={e => setFormData({ ...formData, issue_authority: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">비고</label>
                  <input type="text" placeholder="특이사항" value={formData.note || ""} onChange={e => setFormData({ ...formData, note: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleSaveVisa} disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}{editId ? "수정" : "등록"}하기
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 border border-gray-200">취소</button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="이름, 비자번호, 국적 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
            </div>
            <div className="flex gap-1.5">
              {["all", "ACTIVE", "EXPIRING_SOON", "EXPIRED"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-[var(--brand-navy)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                  {s === "all" ? "전체" : STAY_STATUSES[s]?.label || s}
                </button>
              ))}
            </div>
            <select value={visaTypeFilter} onChange={e => setVisaTypeFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500 border-0">
              <option value="all">비자유형 전체</option>
              {VISA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Visa Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">국적</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">비자유형</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">비자번호</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">여권번호</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">만료일</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">잔여일</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisas.map(visa => {
                    const days = getDaysUntilExpiry(visa.expire_date);
                    const st = STAY_STATUSES[visa.stay_status] || STAY_STATUSES["ACTIVE"];
                    const StatusIcon = st.icon;
                    return (
                      <tr key={visa.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--brand-blue)" }}>
                              {(visa.employee_name || "?")[0]}
                            </div>
                            <div>
                              <div className="font-semibold" style={{ color: "var(--brand-navy)" }}>{visa.employee_name}</div>
                              <div className="text-[11px] text-gray-400">{visa.employee_no}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="flex items-center gap-1.5 text-gray-600"><Flag size={13} />{visa.nationality}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: "rgba(42,125,225,0.1)", color: "#2a7de1" }}>{visa.visa_type}</span>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-gray-500">{visa.visa_no}</td>
                        <td className="px-4 py-4 text-xs font-mono text-gray-400">{visa.passport_no}</td>
                        <td className="px-4 py-4 text-xs text-gray-500">{visa.expire_date}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold" style={{ color: days <= 0 ? "#e63946" : days <= 90 ? "#f59e0b" : "#0f9d58" }}>
                            {days <= 0 ? `+${Math.abs(days)}일` : `D-${days}`}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>
                            <StatusIcon size={12} />{st.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setEditId(visa.id); setFormData(visa); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit size={15} /></button>
                            <button onClick={() => handleDeleteVisa(visa.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVisas.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════ Stay Records ══════ */}
      {activeTab === "stay" && (
        <>
          {/* Stay Form */}
          {showStayForm && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>체류 기록 추가</h3>
                <button onClick={() => setShowStayForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">대상자 (비자)</label>
                  <select value={stayFormData.visa_id || ""} onChange={e => setStayFormData({ ...stayFormData, visa_id: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]">
                    <option value="">선택</option>
                    {visas.map(v => <option key={v.id} value={v.id}>{v.employee_name} ({v.visa_type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">행위 유형</label>
                  <select value={stayFormData.action_type || ""} onChange={e => setStayFormData({ ...stayFormData, action_type: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]">
                    <option value="">선택</option>
                    {Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">일자</label>
                  <input type="date" value={stayFormData.action_date || ""} onChange={e => setStayFormData({ ...stayFormData, action_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">변경 후 상태</label>
                  <select value={stayFormData.stay_status_after || ""} onChange={e => setStayFormData({ ...stayFormData, stay_status_after: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]">
                    <option value="">변경없음</option>
                    {Object.entries(STAY_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">처리기관</label>
                  <input type="text" placeholder="출입국관리사무소" value={stayFormData.authority || ""} onChange={e => setStayFormData({ ...stayFormData, authority: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">비고</label>
                  <input type="text" placeholder="메모" value={stayFormData.note || ""} onChange={e => setStayFormData({ ...stayFormData, note: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleSaveStay} disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}기록 저장
                </button>
                <button onClick={() => setShowStayForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 border border-gray-200">취소</button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 max-w-md">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="이름 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
            </div>
          </div>

          {/* Stay Records Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">일자</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">행위</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이전 상태</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이후 상태</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">처리기관</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {stayRecords.filter(r => !searchTerm || (r.employee_name || "").includes(searchTerm)).map(rec => {
                    const at = ACTION_TYPES[rec.action_type] || { label: rec.action_type, color: "#8b95a5" };
                    const stBefore = STAY_STATUSES[rec.stay_status_before] || null;
                    const stAfter = STAY_STATUSES[rec.stay_status_after] || null;
                    return (
                      <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-gray-600">{rec.action_date}</td>
                        <td className="px-4 py-4 font-semibold" style={{ color: "var(--brand-navy)" }}>{rec.employee_name}</td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${at.color}15`, color: at.color }}>{at.label}</span>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {stBefore ? <span style={{ color: stBefore.text }}>{stBefore.label}</span> : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {stAfter ? <span className="font-semibold" style={{ color: stAfter.text }}>{stAfter.label}</span> : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs">{rec.authority}</td>
                        <td className="px-4 py-4 text-gray-400 text-xs">{rec.note}</td>
                      </tr>
                    );
                  })}
                  {stayRecords.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
