import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { downloadCsv, JOB_APPLICATION_COLUMNS } from "../../lib/csv-export";
import { useState, useEffect } from "react";
import { Search, Download, Eye, Edit, Phone, MapPin, Calendar, ChevronLeft, ChevronRight, User, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = { APPLIED: "신규접수", CONTACTED: "연락완료", COUNSELED: "상담완료", INTERVIEW: "면접예정", PASSED: "합격", FAILED: "불합격", HOLD: "보류" };
const statusStyles: Record<string, { bg: string; text: string }> = {
  APPLIED: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  CONTACTED: { bg: "rgba(30,86,160,0.1)", text: "#1e56a0" },
  COUNSELED: { bg: "rgba(59,125,219,0.1)", text: "#3b7ddb" },
  INTERVIEW: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  PASSED: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  FAILED: { bg: "rgba(230,57,70,0.1)", text: "#e63946" },
  HOLD: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
};

export default function AdminApplicants() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [memo, setMemo] = useState("");

  const load = async () => {
    try {
      const data = await api.jobApplications.listEnriched();
      setApplications(data.sort((a: any, b: any) => (b.applied_at || "").localeCompare(a.applied_at || "")));
    } catch (e) { handleError(e, { fallback: "지원자 목록을 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await api.jobApplications.update(appId, { status: newStatus });
      handleSuccess("상태가 변경되었습니다.");
      await load();
      if (selected?.id === appId) {
        setSelected({ ...selected, status: newStatus });
      }
    } catch (e) { handleError(e, { fallback: "상태 변경에 실패했습니다." }); }
  };

  const handleMemoSave = async () => {
    if (!selected || !memo.trim()) return;
    try {
      await api.jobApplications.update(selected.id, { memo });
      handleSuccess("메모가 저장되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "메모 저장에 실패했습니다." }); }
  };

  const filtered = applications.filter((a) => {
    const matchSearch = (a.applicant_name || "").includes(searchTerm) || (a.job_title || "").includes(searchTerm);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  const appliedCount = applications.filter(a => a.status === "APPLIED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>지원자 관리</h1>
          <p className="text-sm text-gray-400 mt-1">총 {applications.length}명 · 신규접수 {appliedCount}명</p>
        </div>
        <button onClick={() => downloadCsv(filtered, JOB_APPLICATION_COLUMNS, `지원자목록_${new Date().toISOString().split("T")[0]}`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"><Download size={16} />엑셀 다운로드</button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="이름, 지원공고 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "APPLIED", "CONTACTED", "INTERVIEW", "PASSED", "FAILED", "HOLD"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-[var(--brand-navy)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
              {s === "all" ? "전체" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${selected ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">지원공고</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">희망근무지</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">접수일</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const st = statusStyles[a.status] || statusStyles["HOLD"];
                  return (
                    <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${selected?.id === a.id ? "bg-[var(--brand-sky)]/30" : ""}`} onClick={() => { setSelected(a); setMemo(a.memo || ""); }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--brand-blue)" }}>{(a.applicant_name || "?")[0]}</div>
                          <div>
                            <div className="font-semibold" style={{ color: "var(--brand-navy)" }}>{a.applicant_name}</div>
                            <div className="text-[11px] text-gray-400">{a.applicant_career || "무경력"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">{a.job_title}</td>
                      <td className="px-4 py-4 text-gray-500 text-sm">{a.desired_location || a.job_location}</td>
                      <td className="px-4 py-4 text-gray-500 text-xs">{a.applied_at?.split("T")[0]}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>{STATUS_LABELS[a.status] || a.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>지원자 상세</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
            </div>
            <div className="flex flex-col items-center mb-5 pb-5 border-b border-gray-100">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold mb-3" style={{ backgroundColor: "var(--brand-blue)" }}>{(selected.applicant_name || "?")[0]}</div>
              <div className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{selected.applicant_name}</div>
              <div className="text-sm text-gray-400 mt-0.5">{selected.applicant_career || "무경력"}</div>
              {selected.applicant_nationality && selected.applicant_nationality !== "한국" && (
                <div className="text-xs text-gray-400 mt-1">{selected.applicant_nationality}</div>
              )}
            </div>
            <div className="space-y-3.5">
              {[
                { icon: Phone, label: "연락처", value: selected.applicant_mobile },
                { icon: MapPin, label: "희망근무지", value: selected.desired_location || selected.job_location },
                { icon: User, label: "지원공고", value: selected.job_title },
                { icon: Calendar, label: "접수일", value: selected.applied_at?.split("T")[0] },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0"><item.icon size={14} className="text-gray-400" /></div>
                  <div>
                    <div className="text-[10px] text-gray-400">{item.label}</div>
                    <div className="text-sm font-medium" style={{ color: "var(--brand-navy)" }}>{item.value || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-400 mb-2">상태 변경</label>
              <select value={selected.status} onChange={(e) => handleStatusChange(selected.id, e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-400 mb-2">관리자 메모</label>
              <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모를 입력하세요..." />
            </div>
            <button onClick={handleMemoSave} className="w-full mt-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "var(--brand-blue)" }}>저장</button>
          </div>
        )}
      </div>
    </div>
  );
}