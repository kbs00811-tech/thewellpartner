import { useState, useEffect } from "react";
import { Search, Download, Plus, Eye, Edit, Trash2, Loader2, X, Save } from "lucide-react";
import * as api from "../../lib/api";
import { downloadCsv, EMPLOYEE_COLUMNS } from "../../lib/csv-export";
import { handleError, handleSuccess } from "../../lib/error-handler";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "재직", RESIGNED: "퇴직", LEAVE: "휴직", BLOCKED: "발급제한" };
const statusStyles: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  RESIGNED: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
  LEAVE: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  BLOCKED: { bg: "rgba(230,57,70,0.1)", text: "#e63946" },
};

export default function AdminEmployees() {
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);

  const load = async () => {
    try {
      const data = await api.employees.list();
      setEmployeeList(data.sort((a: any, b: any) => (a.employee_no || "").localeCompare(b.employee_no || "")));
    } catch (e) { handleError(e, { fallback: "직원 목록을 불러오는 데 실패했습니다." }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!formData.name) return;
    setSaving(true);
    try {
      const allEmps = await api.employees.list();
      const maxNo = allEmps.reduce((max: number, e: any) => {
        const num = parseInt((e.employee_no || "EMP-000").replace("EMP-", ""), 10);
        return num > max ? num : max;
      }, 0);
      const newNo = `EMP-${String(maxNo + 1).padStart(3, "0")}`;

      await api.employees.create({
        ...formData,
        employee_no: newNo,
        employment_status: "ACTIVE",
        employment_type: formData.employment_type || "정규직",
        nationality: formData.nationality || "한국",
      });
      setShowForm(false);
      setFormData({});
      handleSuccess("직원이 등록되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "직원 등록에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.employees.remove(id);
      handleSuccess("직원 정보가 삭제되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "삭제에 실패했습니다." }); }
  };

  const handleStatusChange = async (emp: any, newStatus: string) => {
    try {
      await api.employees.update(emp.id, { employment_status: newStatus, resign_date: newStatus === "RESIGNED" ? new Date().toISOString().split("T")[0] : emp.resign_date });
      handleSuccess("상태가 변경되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "상태 변경에 실패했습니다." }); }
  };

  const handleUpdate = async () => {
    if (!editingEmp) return;
    setSaving(true);
    try {
      await api.employees.update(editingEmp.id, editingEmp);
      setEditingEmp(null);
      handleSuccess("직원 정보가 수정되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "수정에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const filtered = employeeList.filter((e) => {
    const matchSearch = (e.name || "").includes(searchTerm) || (e.employee_no || "").includes(searchTerm) || (e.department_name || "").includes(searchTerm);
    const matchStatus = statusFilter === "all" || e.employment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  const activeCount = employeeList.filter(e => e.employment_status === "ACTIVE").length;
  const resignedCount = employeeList.filter(e => e.employment_status === "RESIGNED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>직원 정보 관리</h1>
          <p className="text-sm text-gray-400 mt-1">총 {employeeList.length}명 · 재직 {activeCount}명 · 퇴직 {resignedCount}명</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCsv(filtered, EMPLOYEE_COLUMNS, `직원목록_${new Date().toISOString().split("T")[0]}`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"><Download size={16} />엑셀 다운로드</button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25" style={{ backgroundColor: "var(--brand-blue)" }}>
            <Plus size={16} />직원 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="이름, 사번, 부서 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <div className="flex gap-1.5">
          {["all", "ACTIVE", "RESIGNED", "LEAVE"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-[var(--brand-navy)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
              {s === "all" ? "전체" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>신규 직원 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "name", label: "이름", placeholder: "홍길동" },
              { key: "birth_date", label: "생년월일", placeholder: "", type: "date" },
              { key: "mobile", label: "연락처", placeholder: "010-0000-0000" },
              { key: "email", label: "이메일", placeholder: "example@thewellpartner.com" },
              { key: "department_name", label: "부서", placeholder: "생산팀" },
              { key: "position_name", label: "직위", placeholder: "사원" },
              { key: "hire_date", label: "입사일", placeholder: "", type: "date" },
              { key: "site_name", label: "배치 현장", placeholder: "OO기업" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                <input type={f.type || "text"} placeholder={f.placeholder} value={formData[f.key] || ""} onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleCreate} disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}등록하기
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 border border-gray-200">취소</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">사번</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">부서</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">직위</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">배치현장</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">입사일</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const st = statusStyles[emp.employment_status] || statusStyles["ACTIVE"];
                return (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">{emp.employee_no}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: emp.employment_status === "RESIGNED" ? "#8b95a5" : "var(--brand-blue)" }}>{(emp.name || "?")[0]}</div>
                        <div>
                          <div className="font-semibold" style={{ color: "var(--brand-navy)" }}>{emp.name}</div>
                          <div className="text-[11px] text-gray-400">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{emp.department_name}</td>
                    <td className="px-4 py-4 text-gray-600">{emp.position_name}</td>
                    <td className="px-4 py-4 text-gray-500">{emp.site_name || "-"}</td>
                    <td className="px-4 py-4 text-gray-500 text-xs">{emp.hire_date}</td>
                    <td className="px-4 py-4">
                      <select value={emp.employment_status} onChange={(e) => handleStatusChange(emp, e.target.value)} className="px-2.5 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer" style={{ backgroundColor: st.bg, color: st.text }}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setEditingEmp({ ...emp })} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit size={15} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" onClick={() => handleDelete(emp.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingEmp(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>
                직원 정보 수정 — {editingEmp.name}
              </h3>
              <button onClick={() => setEditingEmp(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: "name", label: "이름" },
                { key: "birth_date", label: "생년월일", type: "date" },
                { key: "mobile", label: "연락처" },
                { key: "email", label: "이메일" },
                { key: "department_name", label: "부서" },
                { key: "position_name", label: "직위" },
                { key: "site_name", label: "배치 현장" },
                { key: "hire_date", label: "입사일", type: "date" },
                { key: "nationality", label: "국적" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={editingEmp[f.key] || ""}
                    onChange={(e) => setEditingEmp({ ...editingEmp, [f.key]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">고용형태</label>
                <select value={editingEmp.employment_type || "정규직"} onChange={(e) => setEditingEmp({ ...editingEmp, employment_type: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="파견직">파견직</option>
                  <option value="일용직">일용직</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">상태</label>
                <select value={editingEmp.employment_status || "ACTIVE"} onChange={(e) => setEditingEmp({ ...editingEmp, employment_status: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingEmp(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">취소</button>
              <button onClick={handleUpdate} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} />저장</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}