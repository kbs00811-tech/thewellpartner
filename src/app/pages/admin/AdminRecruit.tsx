import { useState, useEffect } from "react";
import { Search, Plus, Filter, Eye, Edit, Trash2, Download, MapPin, Users, Calendar, ChevronLeft, ChevronRight, Loader2, X, Save } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

const STATUS_LABELS: Record<string, string> = { OPEN: "모집중", CLOSED: "마감", DRAFT: "보류", HIDDEN: "숨김" };
const statusStyles: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  CLOSED: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
  DRAFT: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  HIDDEN: { bg: "rgba(74,85,104,0.1)", text: "#4a5568" },
};

export default function AdminRecruit() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  const loadJobs = async () => {
    try {
      const data = await api.jobPosts.list();
      setJobs(data.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")));
    } catch (e) { handleError(e, { fallback: "채용공고를 불러오는 데 실패했습니다." }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleCreate = async () => {
    if (!formData.title) return;
    setSaving(true);
    try {
      await api.jobPosts.create({
        ...formData,
        status: "OPEN",
        salary_min: Number(formData.salary_min) || 0,
        salary_max: Number(formData.salary_max) || 0,
        recruitment_count: Number(formData.recruitment_count) || 0,
        dormitory_available: formData.dormitory_available === "true",
        foreigner_allowed: formData.foreigner_allowed === "true",
        published_at: new Date().toISOString(),
      });
      setShowForm(false);
      setFormData({});
      handleSuccess("채용공고가 등록되었습니다.");
      await loadJobs();
    } catch (e) { handleError(e, { fallback: "채용공고 등록에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.jobPosts.remove(id);
      handleSuccess("채용공고가 삭제되었습니다.");
      await loadJobs();
    } catch (e) { handleError(e, { fallback: "삭제에 실패했습니다." }); }
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;
    setSaving(true);
    try {
      await api.jobPosts.update(editingJob.id, {
        ...editingJob,
        salary_min: Number(editingJob.salary_min) || 0,
        salary_max: Number(editingJob.salary_max) || 0,
        recruitment_count: Number(editingJob.recruitment_count) || 0,
      });
      setEditingJob(null);
      await loadJobs();
    } catch (e) { handleError(e, { fallback: "수정에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (job: any, newStatus: string) => {
    try {
      await api.jobPosts.update(job.id, { status: newStatus });
      await loadJobs();
    } catch (e) { handleError(e, { fallback: "상태 변경에 실패했습니다." }); }
  };

  const filtered = jobs.filter((j) => {
    const matchSearch = (j.title || "").includes(searchTerm) || (j.company_name || "").includes(searchTerm);
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = jobs.filter(j => j.status === "OPEN").length;

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>채용공고 관리</h1>
          <p className="text-sm text-gray-400 mt-1">총 {jobs.length}건의 공고 · 모집중 {openCount}건</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"><Download size={16} />엑셀 다운로드</button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25" style={{ backgroundColor: "var(--brand-blue)" }}>
            <Plus size={16} />새 공고 등록
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="공고제목, 회사명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          {["all", "OPEN", "CLOSED", "DRAFT", "HIDDEN"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-[var(--brand-navy)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
              {s === "all" ? "전체" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* New Job Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>새 채용공고 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "title", label: "공고 제목", placeholder: "예: 반도체 생산직 모집" },
              { key: "company_name", label: "회사명", placeholder: "예: OO반도체" },
              { key: "work_location", label: "근무지", placeholder: "예: 경기도 화성시" },
              { key: "job_category", label: "직무", placeholder: "예: 반도체" },
              { key: "employment_type", label: "근무형태", placeholder: "정규직 / 계약직" },
              { key: "salary_min", label: "최소급여", placeholder: "예: 2800000", type: "number" },
              { key: "salary_max", label: "최대급여", placeholder: "예: 3200000", type: "number" },
              { key: "working_hours", label: "근무시간", placeholder: "예: 주간 2교대" },
              { key: "recruitment_count", label: "모집인원", placeholder: "예: 10", type: "number" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{field.label}</label>
                <input type="text" placeholder={field.placeholder} value={formData[field.key] || ""} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">상세 설명</label>
            <textarea rows={3} placeholder="업무 내용을 상세히 입력하세요..." value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] resize-none" />
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleCreate} disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}등록하기
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 border border-gray-200">취소</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">공고제목</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">회사명</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">근무지</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">급여</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">모집인원</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">마감일</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => {
                const st = statusStyles[job.status] || statusStyles["CLOSED"];
                const salaryText = job.salary_min ? `${(job.salary_min / 10000).toFixed(0)}~${(job.salary_max / 10000).toFixed(0)}만원` : "-";
                return (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold" style={{ color: "var(--brand-navy)" }}>{job.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{job.employment_type} · {job.job_category}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{job.company_name}</td>
                    <td className="px-4 py-4"><span className="flex items-center gap-1 text-gray-500"><MapPin size={13} />{job.work_location}</span></td>
                    <td className="px-4 py-4 text-gray-600">{salaryText}</td>
                    <td className="px-4 py-4 text-center"><span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--brand-blue)" }}><Users size={13} />{job.recruitment_count || "-"}</span></td>
                    <td className="px-4 py-4"><span className="flex items-center gap-1 text-gray-500 text-xs"><Calendar size={13} />{job.deadline_at?.split("T")[0] || "-"}</span></td>
                    <td className="px-4 py-4">
                      <select value={job.status} onChange={(e) => handleStatusChange(job, e.target.value)} className="px-2.5 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer" style={{ backgroundColor: st.bg, color: st.text }}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setEditingJob({ ...job })} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit size={15} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" onClick={() => handleDelete(job.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingJob(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>채용공고 수정</h3>
              <button onClick={() => setEditingJob(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: "title", label: "공고 제목" },
                { key: "company_name", label: "회사명" },
                { key: "work_location", label: "근무지" },
                { key: "job_category", label: "직무" },
                { key: "employment_type", label: "근무형태" },
                { key: "salary_min", label: "최소급여", type: "number" },
                { key: "salary_max", label: "최대급여", type: "number" },
                { key: "working_hours", label: "근무시간" },
                { key: "recruitment_count", label: "모집인원", type: "number" },
                { key: "deadline_at", label: "마감일", type: "date" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={editingJob[f.key] || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, [f.key]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">상태</label>
                <select value={editingJob.status || "OPEN"} onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">상세 설명</label>
                <textarea
                  rows={4}
                  value={editingJob.description || ""}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-[var(--brand-blue)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editingJob.dormitory_available || false} onChange={(e) => setEditingJob({ ...editingJob, dormitory_available: e.target.checked })} />
                  기숙사 제공
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editingJob.foreigner_allowed || false} onChange={(e) => setEditingJob({ ...editingJob, foreigner_allowed: e.target.checked })} />
                  외국인 가능
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingJob(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">취소</button>
              <button onClick={handleUpdateJob} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} />저장</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}