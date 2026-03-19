import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Search, Plus, Building2, MapPin, Users, Calendar, Eye, Edit, Loader2, ChevronRight, ArrowLeftRight, Clock, CheckCircle2, XCircle, X } from "lucide-react";
import * as api from "../../lib/api";
import { handleError } from "../../lib/error-handler";

const TABS = ["고객사", "현장관리", "배치관리", "근태관리"] as const;
type Tab = typeof TABS[number];

const placementStatusLabels: Record<string, string> = { ASSIGNED: "배치예정", WORKING: "근무중", ENDED: "종료", REPLACED: "교체" };
const placementStatusStyles: Record<string, { bg: string; text: string }> = {
  ASSIGNED: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  WORKING: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  ENDED: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
  REPLACED: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
};
const attendanceStatusLabels: Record<string, string> = { PRESENT: "출근", LATE: "지각", EARLY_LEAVE: "조퇴", ABSENT: "결근", HOLIDAY: "휴일" };
const attendanceStatusStyles: Record<string, { bg: string; text: string }> = {
  PRESENT: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  LATE: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  EARLY_LEAVE: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  ABSENT: { bg: "rgba(230,57,70,0.1)", text: "#e63946" },
  HOLIDAY: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
};

export default function AdminErp() {
  const location = useLocation();
  const getInitialTab = (): Tab => {
    if (location.pathname.includes("sites")) return "현장관리";
    if (location.pathname.includes("placements")) return "배치관리";
    if (location.pathname.includes("attendance")) return "근태관리";
    return "고객사";
  };
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [erpDash, setErpDash] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, s, p, a, d] = await Promise.all([
        api.erpApi.clientCompanies.list(),
        api.erpApi.workSites.list(),
        api.erpApi.placements.list(),
        api.erpApi.attendance.list(),
        api.erpApi.getDashboard(),
      ]);
      setClients(c);
      setSites(s);
      setPlacements(p);
      setAttendance(a);
      setErpDash(d);
    } catch (e) { handleError(e, { fallback: "ERP 데이터를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  const dash = erpDash || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>ERP 인력운영</h1>
          <p className="text-sm text-gray-400 mt-1">고객사·현장·배치·근태 통합 관리</p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "활성 고객사", value: dash.activeClients || 0, color: "#1e56a0" },
          { label: "활성 현장", value: dash.activeSites || 0, color: "#2a7de1" },
          { label: "충원율", value: `${dash.fillRate || 0}%`, color: "#0f9d58" },
          { label: "근무중 인원", value: dash.workingPlacements || 0, color: "#8b5cf6" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl max-w-2xl">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSearchTerm(""); }} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeTab === tab ? { color: "var(--brand-navy)" } : {}}>
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
      </div>

      {/* 고객사 */}
      {activeTab === "고객사" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.filter((c) => !searchTerm || (c.company_name || "").includes(searchTerm)).map((client) => {
            const clientSites = sites.filter((s) => s.client_company_id === client.id);
            return (
              <div key={client.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-transparent transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(30,86,160,0.1)" }}>
                    <Building2 size={20} style={{ color: "#1e56a0" }} />
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${client.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {client.is_active ? "활성" : "비활성"}
                  </span>
                </div>
                <h3 className="font-bold mb-1" style={{ color: "var(--brand-navy)" }}>{client.company_name}</h3>
                <div className="text-xs text-gray-400 mb-3">{client.business_no}</div>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><Users size={13} />{client.contact_name} · {client.contact_mobile}</div>
                  <div className="flex items-center gap-2"><MapPin size={13} />{client.address}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">현장 {clientSites.length}개</span>
                  <span className="text-xs text-gray-400">{client.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 현장관리 */}
      {activeTab === "현장관리" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">현장명</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">고객사</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">업종</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">교대형태</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">필요/현재</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">충원율</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">기숙사</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">통근버스</th>
                </tr>
              </thead>
              <tbody>
                {sites.filter((s) => !searchTerm || (s.site_name || "").includes(searchTerm) || (s.client_company_name || "").includes(searchTerm)).map((site) => {
                  const fillRate = site.required_headcount > 0 ? Math.round((site.current_headcount / site.required_headcount) * 100) : 0;
                  const fillColor = fillRate >= 90 ? "#0f9d58" : fillRate >= 70 ? "#2a7de1" : "#e63946";
                  return (
                    <tr key={site.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold" style={{ color: "var(--brand-navy)" }}>{site.site_name}</div>
                        <div className="text-[11px] text-gray-400">{site.site_address}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{site.client_company_name}</td>
                      <td className="px-4 py-4 text-gray-600">{site.work_type}</td>
                      <td className="px-4 py-4 text-gray-600">{site.shift_type}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold" style={{ color: "var(--brand-blue)" }}>{site.current_headcount}</span>
                        <span className="text-gray-400"> / {site.required_headcount}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-bold" style={{ color: fillColor }}>{fillRate}%</span>
                      </td>
                      <td className="px-4 py-4 text-center">{site.dormitory_available ? <CheckCircle2 size={16} className="mx-auto text-green-500" /> : <XCircle size={16} className="mx-auto text-gray-300" />}</td>
                      <td className="px-4 py-4 text-center">{site.commute_bus_available ? <CheckCircle2 size={16} className="mx-auto text-green-500" /> : <XCircle size={16} className="mx-auto text-gray-300" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 배치관리 */}
      {activeTab === "배치관리" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">사번</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">현장명</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">고객사</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">배치일</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">교대조</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                </tr>
              </thead>
              <tbody>
                {placements.filter((p) => !searchTerm || (p.employee_name || "").includes(searchTerm) || (p.site_name || "").includes(searchTerm))
                  .sort((a, b) => (a.status === "WORKING" ? 0 : 1) - (b.status === "WORKING" ? 0 : 1))
                  .map((plc) => {
                    const st = placementStatusStyles[plc.status] || placementStatusStyles["ENDED"];
                    return (
                      <tr key={plc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-mono text-gray-500">{plc.employee_no}</td>
                        <td className="px-4 py-4 font-medium" style={{ color: "var(--brand-navy)" }}>{plc.employee_name}</td>
                        <td className="px-4 py-4 text-gray-600">{plc.site_name}</td>
                        <td className="px-4 py-4 text-gray-500">{plc.client_name}</td>
                        <td className="px-4 py-4 text-gray-500 text-xs">{plc.assigned_date}</td>
                        <td className="px-4 py-4 text-gray-600">{plc.shift_group === "DAY" ? "주간" : plc.shift_group === "NIGHT" ? "야간" : plc.shift_group}</td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>
                            {placementStatusLabels[plc.status] || plc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 근태관리 */}
      {activeTab === "근태관리" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">근무일</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">사번</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">현장명</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">출근</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">퇴근</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">연장</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">야간</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                </tr>
              </thead>
              <tbody>
                {attendance.filter((a) => !searchTerm || (a.employee_name || "").includes(searchTerm) || (a.site_name || "").includes(searchTerm))
                  .sort((a, b) => (b.work_date || "").localeCompare(a.work_date || ""))
                  .map((att) => {
                    const st = attendanceStatusStyles[att.attendance_status] || attendanceStatusStyles["PRESENT"];
                    return (
                      <tr key={att.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-600">{att.work_date}</td>
                        <td className="px-4 py-4 text-xs font-mono text-gray-500">{att.employee_no}</td>
                        <td className="px-4 py-4 font-medium" style={{ color: "var(--brand-navy)" }}>{att.employee_name}</td>
                        <td className="px-4 py-4 text-gray-500">{att.site_name}</td>
                        <td className="px-4 py-4 text-center text-gray-600">{att.check_in_time || "-"}</td>
                        <td className="px-4 py-4 text-center text-gray-600">{att.check_out_time || "-"}</td>
                        <td className="px-4 py-4 text-center">{att.overtime_hours > 0 ? <span className="font-semibold" style={{ color: "var(--brand-blue)" }}>{att.overtime_hours}h</span> : <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-4 text-center">{att.night_hours > 0 ? <span className="font-semibold" style={{ color: "#8b5cf6" }}>{att.night_hours}h</span> : <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>
                            {attendanceStatusLabels[att.attendance_status] || att.attendance_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}