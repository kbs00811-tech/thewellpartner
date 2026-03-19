import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Search, Plus, Edit, Trash2, Loader2, Image, FileText, HelpCircle, Eye, EyeOff, ArrowUp, ArrowDown, CheckCircle2, X, Save, Building2, Briefcase, Upload, ImagePlus, Download, FolderOpen } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess, handleWarning } from "../../lib/error-handler";

type Tab = "banners" | "notices" | "faq" | "about" | "business" | "materials";

export default function AdminWebsite() {
  const location = useLocation();
  const getTab = (): Tab => {
    if (location.pathname.includes("notices")) return "notices";
    if (location.pathname.includes("faq")) return "faq";
    if (location.pathname.includes("about")) return "about";
    if (location.pathname.includes("business")) return "business";
    if (location.pathname.includes("materials")) return "materials";
    return "banners";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getTab());
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [materialList, setMaterialList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aboutData, setAboutData] = useState<any>({ ceoGreeting: "", ceoName: "", companyOverview: "", history: "", coreValues: "" });
  const [businessData, setBusinessData] = useState<any>({ production: "", staffing: "", consulting: "", building: "" });
  const [savingContent, setSavingContent] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [b, n, f, mats, aboutContent, bizContent] = await Promise.all([
        api.banners.list(),
        api.noticesAdmin.list(),
        api.faqsAdmin.list(),
        api.materials.list().catch(() => []),
        api.siteContent.get("about").catch(() => ({})),
        api.siteContent.get("business").catch(() => ({})),
      ]);
      setBanners(b);
      setNotices(n);
      setFaqs(f);
      setMaterialList(Array.isArray(mats) ? mats : []);
      if (aboutContent && Object.keys(aboutContent).length > 0) {
        setAboutData({ ceoGreeting: aboutContent.ceoGreeting || "", ceoName: aboutContent.ceoName || "", companyOverview: aboutContent.companyOverview || "", history: aboutContent.history || "", coreValues: aboutContent.coreValues || "" });
      }
      if (bizContent && Object.keys(bizContent).length > 0) {
        setBusinessData({ production: bizContent.production || "", staffing: bizContent.staffing || "", consulting: bizContent.consulting || "", building: bizContent.building || "" });
      }
    } catch (e) { handleError(e, { fallback: "홈페이지 데이터를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const crudMap: Record<string, any> = { banners: api.banners, notices: api.noticesAdmin, faq: api.faqsAdmin, materials: api.materials };
      const crud = crudMap[activeTab];
      if (editing._isNew) {
        const { _isNew, ...data } = editing;
        await crud.create(data);
      } else {
        await crud.update(editing.id, editing);
      }
      await loadAll();
      setEditing(null);
      handleSuccess("저장되었습니다.");
    } catch (e: any) { handleError(e, { fallback: "저장에 실패했습니다." }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const crudMap: Record<string, any> = { banners: api.banners, notices: api.noticesAdmin, faq: api.faqsAdmin, materials: api.materials };
      await crudMap[activeTab].remove(id);
      handleSuccess("삭제되었습니다.");
      await loadAll();
    } catch (e: any) { handleError(e, { fallback: "삭제에 실패했습니다." }); }
  };

  const handleSaveContent = async (section: string) => {
    setSavingContent(true);
    try {
      const payload = section === "about" ? aboutData : businessData;
      await api.siteContent.save(section, payload);
      handleSuccess("콘텐츠가 저장되었습니다.");
    } catch (e: any) { handleError(e, { fallback: "콘텐츠 저장에 실패했습니다." }); }
    finally { setSavingContent(false); }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      handleWarning("JPG, PNG, WebP, GIF 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      handleWarning("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    setUploading(true);
    try {
      const result = await api.storage.upload(file, "banners");
      const imageUrl = result.signed_url || "";
      setEditing((prev: any) => ({ ...prev, image_url: imageUrl, _uploaded_file_id: result.id }));
    } catch (e: any) {
      handleError(e, { fallback: "이미지 업로드에 실패했습니다." });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  const tabs = [
    { key: "banners" as Tab, label: "배너", icon: Image, count: banners.length },
    { key: "notices" as Tab, label: "공지사항", icon: FileText, count: notices.length },
    { key: "faq" as Tab, label: "FAQ", icon: HelpCircle, count: faqs.length },
    { key: "materials" as Tab, label: "자료실", icon: FolderOpen, count: materialList.length },
    { key: "about" as Tab, label: "회사소개", icon: Building2 },
    { key: "business" as Tab, label: "사업분야", icon: Briefcase },
  ];

  const contentTabs = ["about", "business"];
  const showAddButton = !contentTabs.includes(activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>홈페이지 관리</h1>
          <p className="text-sm text-gray-400 mt-1">배너, 공지사항, FAQ, 자료실을 관리합니다</p>
        </div>
        {showAddButton && (
          <button onClick={() => {
            const template: Record<string, any> = {
              banners: { _isNew: true, title: "", subtitle: "", image_url: "", link_url: "", link_type: "INTERNAL", is_active: true, sort_order: banners.length + 1 },
              notices: { _isNew: true, title: "", content: "", is_active: true, is_pinned: false, view_count: 0 },
              faq: { _isNew: true, question: "", answer: "", category: "서비스", is_active: true, sort_order: faqs.length + 1 },
              materials: { _isNew: true, title: "", description: "", file_url: "", file_type: "PDF", file_size: "", is_active: true, sort_order: materialList.length + 1 },
            };
            if (template[activeTab]) setEditing(template[activeTab]);
          }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg" style={{ backgroundColor: "var(--brand-blue)" }}>
            <Plus size={16} />새로 추가
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1.5 bg-gray-100 rounded-2xl overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearchTerm(""); setEditing(null); }} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeTab === tab.key ? { color: "var(--brand-navy)" } : {}}>
            <tab.icon size={14} />{tab.label}
            {"count" in tab && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200/60 text-gray-500">{(tab as any).count}</span>}
          </button>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>
                {editing._isNew ? "새로 추가" : "수정"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {activeTab === "banners" && (
              <div className="space-y-4">
                <div><label className="text-sm font-semibold text-gray-500">제목 *</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><label className="text-sm font-semibold text-gray-500">부제목</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.subtitle || ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>

                {/* 이미지 업로드 영역 */}
                <div>
                  <label className="text-sm font-semibold text-gray-500 mb-2 block">배너 이미지</label>
                  {editing.image_url ? (
                    <div className="relative mb-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={editing.image_url} alt="배너 미리보기" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <button type="button" onClick={() => setEditing({ ...editing, image_url: "" })} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors" title="이미지 제거"><X size={14} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all mb-3">
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                      {uploading ? (<><Loader2 size={28} className="animate-spin text-blue-400 mb-2" /><span className="text-sm text-blue-500 font-medium">업로드 중...</span></>) : (<><ImagePlus size={28} className="text-gray-300 mb-2" /><span className="text-sm text-gray-400 font-medium">클릭하여 이미지 업로드</span><span className="text-[11px] text-gray-300 mt-1">JPG, PNG, WebP, GIF · 최대 10MB</span></>)}
                    </label>
                  )}
                  {editing.image_url && (
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors mb-2">
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploading ? "업로드 중..." : "다른 이미지로 변경"}
                    </label>
                  )}
                  <details className="mt-2">
                    <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-500 select-none">URL 직접 입력 (고급)</summary>
                    <input className="w-full mt-2 px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="https://example.com/image.jpg" value={editing.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                  </details>
                </div>

                <div><label className="text-sm font-semibold text-gray-500">링크 URL</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.link_url || ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} /></div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-500">정렬순서</label>
                  <input type="number" className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />활성</label>
                </div>
              </div>
            )}

            {activeTab === "notices" && (
              <div className="space-y-4">
                <div><label className="text-sm font-semibold text-gray-500">제목 *</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><label className="text-sm font-semibold text-gray-500">내용 *</label><textarea rows={6} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />공개</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_pinned} onChange={(e) => setEditing({ ...editing, is_pinned: e.target.checked })} />중요(상단고정)</label>
                </div>
              </div>
            )}

            {activeTab === "faq" && (
              <div className="space-y-4">
                <div><label className="text-sm font-semibold text-gray-500">카테고리 *</label>
                  <select className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                    <option value="서비스">서비스</option>
                    <option value="채용">채용</option>
                    <option value="비용">비용</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-500">질문 *</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.question || ""} onChange={(e) => setEditing({ ...editing, question: e.target.value })} /></div>
                <div><label className="text-sm font-semibold text-gray-500">답변 *</label><textarea rows={5} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.answer || ""} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} /></div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-500">정렬순서</label>
                  <input type="number" className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />활성</label>
                </div>
              </div>
            )}

            {activeTab === "materials" && (
              <div className="space-y-4">
                <div><label className="text-sm font-semibold text-gray-500">자료명 *</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="예: 회사소개서" /></div>
                <div><label className="text-sm font-semibold text-gray-500">설명</label><textarea rows={3} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="자료에 대한 간단한 설명" /></div>
                <div><label className="text-sm font-semibold text-gray-500">다운로드 URL *</label><input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.file_url || ""} onChange={(e) => setEditing({ ...editing, file_url: e.target.value })} placeholder="https://..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-500">파일 유형</label>
                    <select className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.file_type || "PDF"} onChange={(e) => setEditing({ ...editing, file_type: e.target.value })}>
                      <option value="PDF">PDF</option>
                      <option value="DOCX">DOCX</option>
                      <option value="XLSX">XLSX</option>
                      <option value="PPTX">PPTX</option>
                      <option value="HWP">HWP</option>
                      <option value="ZIP">ZIP</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500">파일 크기</label>
                    <input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={editing.file_size || ""} onChange={(e) => setEditing({ ...editing, file_size: e.target.value })} placeholder="예: 2.5 MB" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-500">정렬순서</label>
                  <input type="number" className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active !== false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />공개</label>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} />저장</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {showAddButton && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 max-w-md">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
          </div>
        </div>
      )}

      {/* Banners */}
      {activeTab === "banners" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.filter((b) => !searchTerm || b.title?.includes(searchTerm)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((banner) => (
            <div key={banner.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
              <div className="h-32 bg-gray-100 flex items-center justify-center" style={banner.image_url ? { backgroundImage: `url(${banner.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                {!banner.image_url && <Image size={32} className="text-gray-300" />}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm" style={{ color: "var(--brand-navy)" }}>{banner.title}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${banner.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {banner.is_active ? "활성" : "비활성"}
                  </span>
                </div>
                {banner.subtitle && <p className="text-xs text-gray-400 mb-3">{banner.subtitle}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">순서: {banner.sort_order}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(banner)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit size={14} className="text-gray-400" /></button>
                    <button onClick={() => handleDelete(banner.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && <div className="col-span-full text-center py-16 text-gray-400">배너가 없습니다. 새로 추가해보세요.</div>}
        </div>
      )}

      {/* Notices */}
      {activeTab === "notices" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs w-12">상태</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">제목</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">조회수</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">작성일</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs w-24">관리</th>
              </tr>
            </thead>
            <tbody>
              {notices.filter((n) => !searchTerm || n.title?.includes(searchTerm)).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).map((notice) => (
                <tr key={notice.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    {notice.is_active ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-300" />}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {notice.is_pinned && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: "var(--brand-blue)" }}>중요</span>}
                      <span className="font-medium" style={{ color: "var(--brand-navy)" }}>{notice.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-gray-400">{notice.view_count || 0}</td>
                  <td className="px-4 py-4 text-center text-gray-400 text-xs">{notice.created_at?.split("T")[0]}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setEditing(notice)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit size={14} className="text-gray-400" /></button>
                      <button onClick={() => handleDelete(notice.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {notices.length === 0 && <div className="text-center py-16 text-gray-400">공지사항이 없습니다.</div>}
        </div>
      )}

      {/* FAQ */}
      {activeTab === "faq" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">카테고리</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">질문</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">순서</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs w-24">관리</th>
              </tr>
            </thead>
            <tbody>
              {faqs.filter((f) => !searchTerm || f.question?.includes(searchTerm)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((faq) => (
                <tr key={faq.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: "rgba(30,86,160,0.1)", color: "var(--brand-blue)" }}>{faq.category}</span>
                  </td>
                  <td className="px-4 py-4 font-medium" style={{ color: "var(--brand-navy)" }}>{faq.question}</td>
                  <td className="px-4 py-4 text-center text-gray-400">{faq.sort_order}</td>
                  <td className="px-4 py-4 text-center">
                    {faq.is_active ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <EyeOff size={14} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setEditing(faq)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit size={14} className="text-gray-400" /></button>
                      <button onClick={() => handleDelete(faq.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {faqs.length === 0 && <div className="text-center py-16 text-gray-400">FAQ가 없습니다.</div>}
        </div>
      )}

      {/* Materials */}
      {activeTab === "materials" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">자료명</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">유형</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">크기</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">순서</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs w-24">관리</th>
              </tr>
            </thead>
            <tbody>
              {materialList.filter((m) => !searchTerm || (m.title || "").includes(searchTerm)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((mat) => (
                <tr key={mat.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--brand-sky)" }}>
                        <FileText size={16} style={{ color: "var(--brand-blue)" }} />
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: "var(--brand-navy)" }}>{mat.title}</div>
                        {mat.description && <div className="text-[11px] text-gray-400 truncate max-w-[200px]">{mat.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500">{mat.file_type || "PDF"}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-xs">{mat.file_size || "-"}</td>
                  <td className="px-4 py-4 text-center text-gray-400">{mat.sort_order}</td>
                  <td className="px-4 py-4 text-center">
                    {mat.is_active !== false ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <EyeOff size={14} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setEditing(mat)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit size={14} className="text-gray-400" /></button>
                      <button onClick={() => handleDelete(mat.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {materialList.length === 0 && <div className="text-center py-16 text-gray-400">등록된 자료가 없습니다. 새로 추가해보세요.</div>}
        </div>
      )}

      {/* About */}
      {activeTab === "about" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>CEO 인사말</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-500">대표이사 성명</label>
                <input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={aboutData.ceoName} onChange={(e) => setAboutData({ ...aboutData, ceoName: e.target.value })} placeholder="OOO" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500">인사말 내용</label>
                <textarea rows={6} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={aboutData.ceoGreeting} onChange={(e) => setAboutData({ ...aboutData, ceoGreeting: e.target.value })} placeholder="CEO 인사말을 입력하세요... (줄바꿈으로 문단 구분)" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>회사 개요</h3>
            <textarea rows={4} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={aboutData.companyOverview} onChange={(e) => setAboutData({ ...aboutData, companyOverview: e.target.value })} placeholder="회사 개요를 입력하세요..." />
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>핵심 가치</h3>
            <p className="text-[11px] text-gray-400 mb-2">한 줄에 하나씩 "제목|설명" 형식으로 입력하세요.</p>
            <textarea rows={4} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={aboutData.coreValues} onChange={(e) => setAboutData({ ...aboutData, coreValues: e.target.value })} placeholder="전문성|산업 현장에 대한 깊은 이해와 전문 지식으로 최적의 솔루션을 제공합니다." />
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>연혁</h3>
            <p className="text-[11px] text-gray-400 mb-2">한 줄에 하나씩 "연도|내용" 형식으로 입력하세요.</p>
            <textarea rows={6} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={aboutData.history} onChange={(e) => setAboutData({ ...aboutData, history: e.target.value })} placeholder="2019|회사 설립&#10;2020|제조/생산 도급 사업 본격 운영 개시" />
          </div>
          <button onClick={() => handleSaveContent("about")} disabled={savingContent} className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-blue-500/25" style={{ backgroundColor: "var(--brand-blue)" }}>
            {savingContent ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            회사소개 콘텐츠 저장
          </button>
        </div>
      )}

      {/* Business */}
      {activeTab === "business" && (
        <div className="space-y-6">
          {[
            { key: "production", label: "생산/물류 도급", desc: "제조, 생산, 물류 현장의 전문 인력을 공급합니다." },
            { key: "staffing", label: "인재파견", desc: "사무직, 기술직 등 다양한 분야의 인재를 파견합니다." },
            { key: "consulting", label: "컨설팅/교육훈련", desc: "인력 운영 컨설팅과 직무 교육을 제공합니다." },
            { key: "building", label: "빌딩 종합관리", desc: "건물 관리에 필요한 인력을 통합 제공합니다." },
          ].map((biz) => (
            <div key={biz.key} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>{biz.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{biz.desc}</p>
                </div>
              </div>
              <textarea rows={4} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" value={(businessData as any)[biz.key] ?? ""} onChange={(e) => setBusinessData({ ...businessData, [biz.key]: e.target.value })} placeholder={`${biz.label} 상세 설명을 입력하세요...`} />
            </div>
          ))}
          <button onClick={() => handleSaveContent("business")} disabled={savingContent} className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-blue-500/25" style={{ backgroundColor: "var(--brand-blue)" }}>
            {savingContent ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            사업분야 콘텐츠 저장
          </button>
        </div>
      )}
    </div>
  );
}
