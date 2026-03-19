import { useState, useEffect } from "react";
import { Search, Download, Loader2, MonitorSmartphone, Clock, User, Shield } from "lucide-react";
import * as api from "../../lib/api";
import { handleError } from "../../lib/error-handler";

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  로그인: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  로그아웃: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
  생성: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  수정: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  삭제: { bg: "rgba(230,57,70,0.1)", text: "#e63946" },
  조회: { bg: "rgba(6,182,212,0.1)", text: "#06b6d4" },
};

export default function AdminAccessLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await api.auditLogs.list();
      setLogs((data || []).sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")));
    } catch (e) { handleError(e, { fallback: "접속 로그를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const getActionStyle = (action: string) => {
    for (const [key, style] of Object.entries(ACTION_STYLES)) {
      if (action?.includes(key)) return style;
    }
    return { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" };
  };

  const filtered = logs.filter(l => {
    const matchSearch = !searchTerm || (l.admin_name || "").includes(searchTerm) || (l.action || "").includes(searchTerm);
    const matchDate = !dateFilter || (l.created_at || "").startsWith(dateFilter);
    return matchSearch && matchDate;
  });

  const handleExportCSV = () => {
    const headers = ["시간,관리자,행위,상세,IP,상태"];
    const rows = filtered.map(l => `${l.created_at || ""},${l.admin_name || ""},${l.action || ""},${l.details || ""},${l.ip || ""},${l.status || ""}`);
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `access-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>접속 로그</h1>
          <p className="text-sm text-gray-400 mt-1">관리자 활동 이력 추적</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50">
          <Download size={16} />CSV 다운로드
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 로그", value: logs.length, color: "#1e56a0", icon: MonitorSmartphone },
          { label: "오늘 활동", value: logs.filter(l => l.created_at?.startsWith(new Date().toISOString().split("T")[0])).length, color: "#0f9d58", icon: Clock },
          { label: "활동 관리자", value: new Set(logs.map(l => l.admin_name)).size, color: "#2a7de1", icon: User },
          { label: "성공률", value: logs.length > 0 ? `${Math.round((logs.filter(l => l.status === "SUCCESS").length / logs.length) * 100)}%` : "0%", color: "#8b5cf6", icon: Shield },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{kpi.label}</span>
              <kpi.icon size={16} style={{ color: kpi.color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="관리자, 행위 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
        {dateFilter && <button onClick={() => setDateFilter("")} className="text-xs text-gray-400 hover:text-gray-600">초기화</button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">시간</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">관리자</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">행위</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상세</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">IP</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                  <MonitorSmartphone size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-1">접속 로그가 없습니다</p>
                  <p className="text-xs">관리자 활동 시 자동으로 기록됩니다</p>
                </td></tr>
              ) : filtered.slice(0, 100).map(log => {
                const st = getActionStyle(log.action);
                return (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{(log.created_at || "").replace("T", " ").slice(0, 19)}</td>
                    <td className="px-4 py-4 font-semibold" style={{ color: "var(--brand-navy)" }}>{log.admin_name}</td>
                    <td className="px-4 py-4"><span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>{log.action}</span></td>
                    <td className="px-4 py-4 text-gray-500 text-xs max-w-[200px] truncate">{log.details || "-"}</td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-400">{log.ip || "-"}</td>
                    <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${log.status === "SUCCESS" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{log.status === "SUCCESS" ? "성공" : "실패"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
