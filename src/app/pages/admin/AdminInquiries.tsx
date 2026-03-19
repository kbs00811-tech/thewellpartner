import * as api from "../../lib/api";
import { downloadCsv, INQUIRY_COLUMNS } from "../../lib/csv-export";
import { useState, useEffect } from "react";
import { Search, Download, Star, StarOff, Phone, Mail, Building2, User, Calendar, ChevronLeft, ChevronRight, MessageSquare, Loader2, Send } from "lucide-react";
import { handleError, handleSuccess } from "../../lib/error-handler";

const STATUS_LABELS: Record<string, string> = { RECEIVED: "접수", CHECKING: "확인중", COUNSELED: "상담완료", HOLD: "보류", CLOSED: "종료" };
const TYPE_LABELS: Record<string, string> = { COMPANY: "기업", JOB_SEEKER: "구직자", PARTNERSHIP: "제휴" };

const statusStyles: Record<string, { bg: string; text: string }> = {
  RECEIVED: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  CHECKING: { bg: "rgba(30,86,160,0.1)", text: "#1e56a0" },
  COUNSELED: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  HOLD: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  CLOSED: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
};
const typeStyles: Record<string, { bg: string; text: string }> = {
  COMPANY: { bg: "rgba(30,86,160,0.1)", text: "#1e56a0" },
  JOB_SEEKER: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  PARTNERSHIP: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
};

export default function AdminInquiries() {
  const [inquiryList, setInquiryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState("");

  const load = async () => {
    try {
      const data = await api.inquiries.list();
      setInquiryList(data.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")));
    } catch (e) { handleError(e, { fallback: "문의 목록을 불러오는 데 실패했습니다." }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selectInquiry = async (inq: any) => {
    setSelected(inq);
    setNewMemo("");
    try {
      const m = await api.inquiries.getMemos(inq.id);
      setMemos(m);
    } catch (e) { setMemos([]); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;
    try {
      await api.inquiries.update(selected.id, { status: newStatus });
      setSelected({ ...selected, status: newStatus });
      handleSuccess("상태가 변경되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "상태 변경에 실패했습니다." }); }
  };

  const handleAssigneeChange = async (adminId: string) => {
    if (!selected) return;
    try {
      await api.inquiries.update(selected.id, { assigned_admin_id: adminId || null });
      handleSuccess("담당자가 변경되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "담당자 변경에 실패했습니다." }); }
  };

  const handleStarToggle = async (inq: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.inquiries.update(inq.id, { is_starred: !inq.is_starred });
      await load();
    } catch (e) { handleError(e, { fallback: "즐겨찾기 변경에 실패했습니다." }); }
  };

  const handleAddMemo = async () => {
    if (!selected || !newMemo.trim()) return;
    try {
      const user = api.getUser();
      await api.inquiryMemos.create({
        inquiry_id: selected.id,
        admin_user_id: user?.id || "admin-1",
        memo: newMemo,
      });
      setNewMemo("");
      handleSuccess("메모가 추가되었습니다.");
      const m = await api.inquiries.getMemos(selected.id);
      setMemos(m);
    } catch (e) { handleError(e, { fallback: "메모 추가에 실패했습니다." }); }
  };

  const filtered = inquiryList.filter((inq) => {
    const matchSearch = (inq.name || "").includes(searchTerm) || (inq.title || "").includes(searchTerm) || (inq.company_name || "").includes(searchTerm);
    const matchType = typeFilter === "all" || inq.inquiry_type === typeFilter;
    const matchStatus = statusFilter === "all" || inq.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  const receivedCount = inquiryList.filter(i => i.status === "RECEIVED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>문의 관리</h1>
          <p className="text-sm text-gray-400 mt-1">총 {inquiryList.length}건 · 미처리 {receivedCount}건</p>
        </div>
        <button onClick={() => downloadCsv(filtered, INQUIRY_COLUMNS, `문의목록_${new Date().toISOString().split("T")[0]}`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"><Download size={16} />엑셀 다운로드</button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="이름, 제목 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <div className="flex gap-1.5">
          {["all", "COMPANY", "JOB_SEEKER", "PARTNERSHIP"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === t ? "bg-[var(--brand-blue)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
              {t === "all" ? "전체유형" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {["all", "RECEIVED", "CHECKING", "COUNSELED", "CLOSED"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-[var(--brand-navy)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
              {s === "all" ? "전체상태" : STATUS_LABELS[s]}
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
                  <th className="w-10 px-3 py-3.5"></th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">유형</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름/회사명</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">제목</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">접수일</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inq) => {
                  const st = statusStyles[inq.status] || statusStyles["CLOSED"];
                  const tp = typeStyles[inq.inquiry_type] || typeStyles["COMPANY"];
                  return (
                    <tr key={inq.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${selected?.id === inq.id ? "bg-[var(--brand-sky)]/30" : ""}`} onClick={() => selectInquiry(inq)}>
                      <td className="px-3 py-4 text-center">
                        <button onClick={(e) => handleStarToggle(inq, e)} className="text-gray-300 hover:text-yellow-400">
                          {inq.is_starred ? <Star size={14} fill="currentColor" className="text-yellow-400" /> : <StarOff size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: tp.bg, color: tp.text }}>{TYPE_LABELS[inq.inquiry_type] || inq.inquiry_type}</span>
                      </td>
                      <td className="px-4 py-4 font-medium" style={{ color: "var(--brand-navy)" }}>{inq.company_name || inq.name}</td>
                      <td className="px-4 py-4 text-gray-600 max-w-[200px] truncate">{inq.title}</td>
                      <td className="px-4 py-4 text-gray-500 text-xs">{inq.created_at?.split("T")[0]}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>{STATUS_LABELS[inq.status] || inq.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>문의 상세</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-400 mb-1">{selected.created_at?.split("T")[0]}</div>
                <div className="text-base font-bold" style={{ color: "var(--brand-navy)" }}>{selected.title}</div>
                <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{selected.content}</div>
              </div>
              {[
                { icon: selected.inquiry_type === "JOB_SEEKER" ? User : Building2, label: selected.inquiry_type === "JOB_SEEKER" ? "이름" : "회사명", value: selected.company_name || selected.name },
                { icon: User, label: "담당자", value: selected.name },
                { icon: Phone, label: "연락처", value: selected.mobile },
                { icon: Mail, label: "이메일", value: selected.email },
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
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">상태 변경</label>
                <select value={selected.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">담당자 지정</label>
                <select defaultValue={selected.assigned_admin_id || ""} onChange={(e) => handleAssigneeChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                  <option value="">미지정</option>
                  <option value="admin-1">관리자</option>
                  <option value="admin-2">이채용</option>
                  <option value="admin-3">박인사</option>
                </select>
              </div>

              {/* Memos */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">상담 메모</label>
                {memos.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {memos.map((m: any, i: number) => (
                      <div key={m.id || i} className="p-2.5 rounded-lg bg-gray-50 text-xs">
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span className="font-semibold">{m.admin_name}</span>
                          <span>{m.created_at?.replace("T", " ").slice(0, 16)}</span>
                        </div>
                        <div className="text-gray-600">{m.memo}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="메모 입력..." className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddMemo()} />
                  <button onClick={handleAddMemo} className="p-2.5 rounded-xl text-white" style={{ backgroundColor: "var(--brand-blue)" }}><Send size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}