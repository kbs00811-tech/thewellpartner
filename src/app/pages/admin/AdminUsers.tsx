import { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, Loader2, X, UserCog, Shield, Mail, Phone } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess, handleWarning } from "../../lib/error-handler";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [u, r] = await Promise.all([api.adminUsers.list(), api.adminRoles.list()]);
      setUsers(u); setRoles(r);
    } catch (e) { handleError(e, { fallback: "관리자 목록을 불러오는 데 실패했습니다." }); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.username || !formData.name) return;
    setSaving(true);
    try {
      if (editId) {
        const update: any = { ...formData };
        if (!update.password_hash) delete update.password_hash;
        await api.adminUsers.update(editId, update);
      } else {
        await api.adminUsers.create({ ...formData, status: "ACTIVE", password_hash: formData.password_hash || "changeme123" });
      }
      setShowForm(false); setFormData({}); setEditId(null);
      handleSuccess(editId ? "계정이 수정되었습니다." : "새 관리자가 등록되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "저장에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const me = api.getUser();
    if (me?.id === id) { handleWarning("본인 계정은 삭제할 수 없습니다."); return; }
    if (!confirm("관리자 계정을 삭제하시겠습니까?")) return;
    try {
      await api.adminUsers.remove(id);
      handleSuccess("관리자 계정이 삭제되었습니다.");
      await load();
    } catch (e) { handleError(e, { fallback: "삭제에 실패했습니다." }); }
  };

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.role_name || "미지정";

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>관리자 계정 관리</h1>
          <p className="text-sm text-gray-400 mt-1">관리자 계정 등록·수정·삭제</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormData({}); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "var(--brand-blue)" }}>
          <Plus size={16} />계정 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{editId ? "계정 수정" : "새 관리자 등록"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">아이디 *</label>
              <input type="text" value={formData.username || ""} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" disabled={!!editId} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">{editId ? "새 비밀번호 (변경 시)" : "비밀번호 *"}</label>
              <input type="password" placeholder={editId ? "변경하지 않으려면 비워두세요" : ""} value={formData.password_hash || ""} onChange={e => setFormData({ ...formData, password_hash: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">이름 *</label>
              <input type="text" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">이메일</label>
              <input type="email" value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">연락처</label>
              <input type="text" value={formData.mobile || ""} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">역할</label>
              <select value={formData.role_id || ""} onChange={e => setFormData({ ...formData, role_id: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)]">
                <option value="">선택</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.role_name} ({r.role_code})</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}{editId ? "수정" : "등록"}하기
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200">취소</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="이름, 아이디 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">아이디</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이메일</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">연락처</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">역할</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">최근 로그인</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => !searchTerm || u.name?.includes(searchTerm) || u.username?.includes(searchTerm)).map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--brand-blue)" }}>{(user.name || "?")[0]}</div>
                      <span className="font-mono text-xs text-gray-500">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold" style={{ color: "var(--brand-navy)" }}>{user.name}</td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{user.email || "-"}</td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{user.mobile || "-"}</td>
                  <td className="px-4 py-4"><span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: "rgba(42,125,225,0.1)", color: "#2a7de1" }}>{getRoleName(user.role_id)}</span></td>
                  <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${user.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{user.status === "ACTIVE" ? "활성" : "비활성"}</span></td>
                  <td className="px-4 py-4 text-xs text-gray-400">{user.last_login_at ? user.last_login_at.replace("T", " ").slice(0, 16) : "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditId(user.id); setFormData({ ...user, password_hash: "" }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
