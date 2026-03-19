import { useState, useEffect } from "react";
import { Shield, Edit, Loader2, X, Check, Plus, Trash2 } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

const ALL_PERMISSIONS = [
  { key: "dashboard", label: "대시보드" },
  { key: "website", label: "홈페이지 관리" },
  { key: "recruit", label: "채용 관리" },
  { key: "applicants", label: "지원자 관리" },
  { key: "inquiries", label: "문의 관리" },
  { key: "employees", label: "직원 관리" },
  { key: "documents", label: "서류발급 관리" },
  { key: "statistics", label: "통계/리포트" },
  { key: "erp", label: "ERP 인력운영" },
  { key: "foreign", label: "외국인 인력관리" },
  { key: "users", label: "회원/권한 관리" },
  { key: "settings", label: "시스템 설정" },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "#1e56a0", WEBSITE_ADMIN: "#0f9d58", RECRUIT_ADMIN: "#2a7de1",
  HR_ADMIN: "#8b5cf6", VIEWER: "#8b95a5",
};

export default function AdminPermissions() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.adminRoles.list();
      setRoles(r);
    } catch (e) { handleError(e, { fallback: "권한 목록을 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const getPermissions = (role: any): string[] => {
    if (role.role_code === "SUPER_ADMIN") return ALL_PERMISSIONS.map(p => p.key);
    return role.permissions || [];
  };

  const handleToggle = (key: string) => {
    const perms = formData.permissions || [];
    setFormData({
      ...formData,
      permissions: perms.includes(key) ? perms.filter((p: string) => p !== key) : [...perms, key],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editRole) {
        await api.adminRoles.update(editRole.id, { ...editRole, ...formData });
      } else {
        await api.adminRoles.create(formData);
      }
      setEditRole(null); setShowForm(false); setFormData({});
      handleSuccess("역할이 저장되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "역할 저장에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("역할을 삭제하시겠습니까?")) return;
    try {
      await api.adminRoles.remove(id);
      handleSuccess("역할이 삭제되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "역할 삭제에 실패했습니다." }); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>권한 그룹 관리</h1>
          <p className="text-sm text-gray-400 mt-1">역할별 접근 권한 설정</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditRole(null); setFormData({ role_name: "", role_code: "", description: "", permissions: [] }); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "var(--brand-blue)" }}>
          <Plus size={16} />역할 추가
        </button>
      </div>

      {/* Edit / Create Form */}
      {(editRole || showForm) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{editRole ? `"${editRole.role_name}" 권한 수정` : "새 역할 등록"}</h3>
            <button onClick={() => { setEditRole(null); setShowForm(false); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          {!editRole && (
            <div className="grid md:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">역할명</label>
                <input type="text" value={formData.role_name || ""} onChange={e => setFormData({ ...formData, role_name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">역할 코드</label>
                <input type="text" placeholder="CUSTOM_ROLE" value={formData.role_code || ""} onChange={e => setFormData({ ...formData, role_code: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">설명</label>
                <input type="text" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_PERMISSIONS.map(perm => {
              const checked = (formData.permissions || []).includes(perm.key);
              return (
                <button key={perm.key} onClick={() => handleToggle(perm.key)} className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm transition-all ${checked ? "border-[var(--brand-blue)] bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-xs ${checked ? "bg-[var(--brand-blue)]" : "bg-gray-200"}`}>
                    {checked && <Check size={12} />}
                  </div>
                  <span className={checked ? "font-semibold text-[var(--brand-navy)]" : "text-gray-500"}>{perm.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}저장
            </button>
            <button onClick={() => { setEditRole(null); setShowForm(false); }} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200">취소</button>
          </div>
        </div>
      )}

      {/* Role Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => {
          const perms = getPermissions(role);
          const color = ROLE_COLORS[role.role_code] || "#2a7de1";
          return (
            <div key={role.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-transparent transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <Shield size={20} style={{ color }} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditRole(role); setFormData({ permissions: role.permissions || (role.role_code === "SUPER_ADMIN" ? ALL_PERMISSIONS.map(p => p.key) : []) }); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit size={15} /></button>
                  {role.role_code !== "SUPER_ADMIN" && <button onClick={() => handleDelete(role.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>}
                </div>
              </div>
              <h3 className="font-bold" style={{ color: "var(--brand-navy)" }}>{role.role_name}</h3>
              <div className="text-xs text-gray-400 mt-1 mb-3 font-mono">{role.role_code}</div>
              <p className="text-xs text-gray-500 mb-4">{role.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {(role.role_code === "SUPER_ADMIN" ? ALL_PERMISSIONS : ALL_PERMISSIONS.filter(p => perms.includes(p.key))).map(p => (
                  <span key={p.key} className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: `${color}10`, color }}>{p.label}</span>
                ))}
                {role.role_code === "SUPER_ADMIN" && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600">전체 접근</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
