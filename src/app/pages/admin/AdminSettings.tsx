import { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2, Phone, Mail, MapPin, Upload, Save, Image, Shield, Bell, FileText,
  Loader2, CheckCircle2, AlertCircle, Globe, Share2, Lock, Clock, Palette,
  ExternalLink, X, RotateCcw,
} from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

type Tab = "company" | "notification" | "email" | "social" | "seo" | "security";

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: "company", label: "회사정보", icon: Building2 },
  { key: "social", label: "소셜/링크", icon: Share2 },
  { key: "seo", label: "SEO/메타", icon: Globe },
  { key: "notification", label: "알림", icon: Bell },
  { key: "email", label: "이메일", icon: Mail },
  { key: "security", label: "보안/서류", icon: Lock },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<any>({
    company_name: "더웰파트너", ceo_name: "OOO", business_no: "XXX-XX-XXXXX",
    phone: "031-XXX-XXXX", email: "contact@thewellpartner.com", address: "경기도 수원시 OO구 OO로 123",
    founded_year: "", business_hours: "평일 09:00 ~ 18:00 (공휴일 제외)",
    branch_address: "", branch_phone: "", branch_email: "",
    logo_file_id: null, logo_url: null, stamp_file_id: null, stamp_url: null,
    // Social
    social_blog: "", social_instagram: "", social_youtube: "", social_facebook: "",
    social_kakao_channel: "", social_linkedin: "",
    // SEO
    site_title: "더웰파트너 | 생산도급 및 인력 채용 전문기업",
    site_description: "30년 경험의 생산도급, 인력파견, 채용 전문 기업 더웰파트너입니다. 기업 맞춤형 인력 솔루션을 제공합니다.",
    site_keywords: "생산도급, 인력파견, 채용, 인력관리, 더웰파트너",
    og_image_url: "",
    // Notification
    notify_inquiry_email: true, notify_applicant_email: true, notify_document_log: false, notify_auth_fail: true,
    // Email
    smtp_server: "smtp.example.com", smtp_port: "587", smtp_email: "noreply@thewellpartner.com", smtp_password: "",
    // File
    allowed_file_types: "PDF, DOC, DOCX, XLS, XLSX, JPG, PNG", max_file_size: "10MB",
    // Security / Doc
    doc_auth_expiry_min: "3", doc_demo_mode: true,
    login_max_attempts: "5", login_lockout_min: "15",
    session_timeout_hour: "24",
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.systemSettings.get();
      setSettings((prev: any) => ({ ...prev, ...res }));
    } catch (e: any) { handleError(e, { fallback: "설정을 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.systemSettings.save(settings);
      setSaved(true);
      handleSuccess("설정이 저장되었습니다.");
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      const msg = handleError(e, { fallback: "저장에 실패했습니다.", silent: true });
      setError(msg);
    } finally { setSaving(false); }
  }, [settings]);

  const handleFileUpload = async (type: "logo" | "stamp", file: File) => {
    setUploading(type);
    try {
      const data = await api.storage.upload(file, type);
      setSettings((prev: any) => ({
        ...prev,
        [`${type}_file_id`]: data.id,
        [`${type}_url`]: data.signed_url,
      }));
    } catch (e: any) { handleError(e, { fallback: "파일 업로드에 실패했습니다." }); }
    finally { setUploading(null); }
  };

  const update = (key: string, value: any) => setSettings((prev: any) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} />
      </div>
    );
  }

  const InputField = ({ label, keyName, type = "text", placeholder = "", disabled = false }: {
    label: string; keyName: string; type?: string; placeholder?: string; disabled?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={settings[keyName] || ""}
        onChange={(e) => update(keyName, e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)] transition-all disabled:opacity-50 disabled:bg-gray-50"
      />
    </div>
  );

  const TextareaField = ({ label, keyName, rows = 3, placeholder = "" }: {
    label: string; keyName: string; rows?: number; placeholder?: string;
  }) => (
    <div className="md:col-span-2">
      <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
      <textarea
        value={settings[keyName] || ""}
        onChange={(e) => update(keyName, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)] transition-all resize-none"
      />
    </div>
  );

  const ToggleField = ({ label, desc, keyName }: { label: string; desc: string; keyName: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--brand-navy)" }}>{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={settings[keyName] ?? false}
          onChange={(e) => update(keyName, e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[var(--brand-blue)]"></div>
      </label>
    </div>
  );

  const SectionCard = ({ icon: Icon, iconBg, iconColor, title, desc, children }: {
    icon: typeof Building2; iconBg: string; iconColor: string; title: string; desc: string; children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: "var(--brand-navy)" }}>{title}</h3>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>시스템 설정</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">회사 기본정보, SEO, 알림, 보안 설정을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-green-50 text-green-600 text-xs sm:text-sm font-medium">
              <CheckCircle2 size={14} /> 저장 완료
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs sm:text-sm font-medium max-w-xs truncate">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            저장
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-[var(--brand-blue)] text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB: 회사정보 ═══ */}
      {activeTab === "company" && (
        <div className="space-y-6 max-w-4xl">
          <SectionCard icon={Building2} iconBg="var(--brand-sky)" iconColor="var(--brand-blue)" title="기본 정보" desc="서류 발급 및 홈페이지에 표시되는 정보">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="회사명" keyName="company_name" />
              <InputField label="대표자명" keyName="ceo_name" />
              <InputField label="사업자번호" keyName="business_no" />
              <InputField label="설립연도" keyName="founded_year" placeholder="2010" />
              <InputField label="대표번호" keyName="phone" />
              <InputField label="이메일" keyName="email" type="email" />
              <InputField label="본사 주소" keyName="address" />
              <InputField label="영업시간" keyName="business_hours" />
            </div>
          </SectionCard>

          <SectionCard icon={MapPin} iconBg="rgba(139,92,246,0.1)" iconColor="#8b5cf6" title="지사 정보" desc="지사가 있는 경우 추가 정보를 입력하세요">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="지사 주소" keyName="branch_address" />
              <InputField label="지사 전화" keyName="branch_phone" />
              <InputField label="지사 이메일" keyName="branch_email" type="email" />
            </div>
          </SectionCard>

          <SectionCard icon={Image} iconBg="rgba(15,157,88,0.1)" iconColor="#0f9d58" title="브랜드 이미지" desc="로고 및 직인 이미지">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">회사 로고</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="로고" className="w-full h-full object-contain" />
                    ) : (
                      <Image size={20} className="text-gray-300" />
                    )}
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload("logo", f); }} />
                  <button
                    onClick={() => logoRef.current?.click()}
                    disabled={uploading === "logo"}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploading === "logo" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    업로드
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">직인 이미지</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                    {settings.stamp_url ? (
                      <img src={settings.stamp_url} alt="직인" className="w-full h-full object-contain" />
                    ) : (
                      <Image size={20} className="text-gray-300" />
                    )}
                  </div>
                  <input ref={stampRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload("stamp", f); }} />
                  <button
                    onClick={() => stampRef.current?.click()}
                    disabled={uploading === "stamp"}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploading === "stamp" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    업로드
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: 소셜/링크 ═══ */}
      {activeTab === "social" && (
        <div className="space-y-6 max-w-4xl">
          <SectionCard icon={Share2} iconBg="rgba(37,99,235,0.1)" iconColor="var(--brand-blue)" title="소셜 미디어 링크" desc="홈페이지 푸터 및 공유에 표시됩니다">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="네이버 블로그" keyName="social_blog" placeholder="https://blog.naver.com/..." />
              <InputField label="인스타그램" keyName="social_instagram" placeholder="https://instagram.com/..." />
              <InputField label="유튜브" keyName="social_youtube" placeholder="https://youtube.com/@..." />
              <InputField label="페이스북" keyName="social_facebook" placeholder="https://facebook.com/..." />
              <InputField label="카카오 채널" keyName="social_kakao_channel" placeholder="https://pf.kakao.com/..." />
              <InputField label="링크드인" keyName="social_linkedin" placeholder="https://linkedin.com/company/..." />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-700">
              <strong>안내:</strong> 입력한 링크는 홈페이지 푸터에 아이콘으로 표시됩니다. 비워두면 해당 아이콘이 숨겨집니다.
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: SEO/메타 ═══ */}
      {activeTab === "seo" && (
        <div className="space-y-6 max-w-4xl">
          <SectionCard icon={Globe} iconBg="rgba(37,99,235,0.1)" iconColor="var(--brand-blue)" title="사이트 메타 정보" desc="검색엔진 최적화(SEO) 및 소셜 공유 미리보기">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <InputField label="사이트 제목 (title)" keyName="site_title" placeholder="더웰파트너 | 생산도급 및 인력 채용 전문기업" />
              </div>
              <TextareaField label="사이트 설명 (description)" keyName="site_description" placeholder="검색 결과에 표시되는 설명문입니다." rows={3} />
              <div className="md:col-span-2">
                <InputField label="키워드 (keywords)" keyName="site_keywords" placeholder="생산도급, 인력파견, 채용" />
              </div>
              <div className="md:col-span-2">
                <InputField label="OG 이미지 URL" keyName="og_image_url" placeholder="https://..." />
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-700">
              <strong>미리보기:</strong> 소셜 미디어에서 링크 공유 시 아래와 같이 표시됩니다.
            </div>
            {/* OG Preview */}
            <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden max-w-md">
              {settings.og_image_url && (
                <div className="h-32 bg-gray-100">
                  <img src={settings.og_image_url} alt="OG" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3 bg-gray-50">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">thewellpartner.com</div>
                <div className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-1">{settings.site_title || "사이트 제목"}</div>
                <div className="text-xs text-gray-500 line-clamp-2">{settings.site_description || "사이트 설명"}</div>
              </div>
            </div>
          </SectionCard>

          {/* 페이지별 SEO 안내 */}
          <SectionCard icon={FileText} iconBg="rgba(139,92,246,0.1)" iconColor="#8b5cf6" title="페이지별 SEO 설정" desc="각 페이지의 메타 정보는 자동 생성됩니다">
            <div className="space-y-2">
              {[
                { page: "홈", path: "/", title: "더웰파트너 | 생산도급 전문기업" },
                { page: "회사소개", path: "/about", title: "회사소개 | 더웰파트너" },
                { page: "사업분야", path: "/business", title: "사업분야 | 더웰파트너" },
                { page: "서비스", path: "/service", title: "서비스 | 더웰파트너" },
                { page: "채용정보", path: "/recruit", title: "채용정보 | 더웰파트너" },
                { page: "문의하기", path: "/contact", title: "문의하기 | 더웰파트너" },
                { page: "서류발급", path: "/docs", title: "서류발급센터 | 더웰파트너" },
                { page: "고객센터", path: "/customer", title: "고객센터 | 더웰파트너" },
              ].map((p) => (
                <div key={p.path} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{p.page}</span>
                    <span className="text-xs text-gray-400">{p.path}</span>
                  </div>
                  <span className="text-xs text-gray-500 truncate max-w-[240px]">{p.title}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-gray-50 text-xs text-gray-500">
              각 페이지의 title 및 description은 코드에서 자동 설정됩니다. 사이트 기본 제목은 위에서 변경할 수 있습니다.
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: 알림 ═══ */}
      {activeTab === "notification" && (
        <div className="space-y-6 max-w-4xl">
          <SectionCard icon={Bell} iconBg="rgba(42,125,225,0.1)" iconColor="var(--brand-blue)" title="알림 설정" desc="문자 및 이메일 알림 설정">
            <div className="space-y-1">
              <ToggleField label="문의 접수 시 이메일 알림" desc="새로운 문의가 접수되면 관리자에게 이메일 발송" keyName="notify_inquiry_email" />
              <ToggleField label="지원자 접수 시 이메일 알림" desc="새로운 지원자가 접수되면 채용담당자에게 알림" keyName="notify_applicant_email" />
              <ToggleField label="서류 발급 시 로그 알림" desc="서류 발급 시 관리자에게 실시간 알림" keyName="notify_document_log" />
              <ToggleField label="인증 실패 시 경고 알림" desc="인증 실패 3회 이상 시 보안 경고" keyName="notify_auth_fail" />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: 이메일 ═══ */}
      {activeTab === "email" && (
        <div className="space-y-6 max-w-4xl">
          <SectionCard icon={Mail} iconBg="rgba(139,92,246,0.1)" iconColor="#8b5cf6" title="SMTP 설정" desc="알림 발송에 사용되는 이메일 설정">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="SMTP 서버" keyName="smtp_server" />
              <InputField label="포트" keyName="smtp_port" />
              <InputField label="발신 이메일" keyName="smtp_email" type="email" />
              <InputField label="비밀번호" keyName="smtp_password" type="password" />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-yellow-50 text-xs text-yellow-700">
              <strong>주의:</strong> SMTP 비밀번호는 암호화되어 저장됩니다. 실제 연동 전 테스트 메일 발송을 권장합니다.
            </div>
          </SectionCard>

          <SectionCard icon={Upload} iconBg="rgba(15,157,88,0.1)" iconColor="#0f9d58" title="파일 업로드 설정" desc="파일 업로드 제한 설정">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="허용 파일 형식" keyName="allowed_file_types" />
              <InputField label="최대 용량" keyName="max_file_size" />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: 보안/서류 ═══ */}
      {activeTab === "security" && (
        <div className="space-y-6 max-w-4xl">
          <SectionCard icon={Lock} iconBg="rgba(239,68,68,0.1)" iconColor="#ef4444" title="로그인 보안" desc="관리자 로그인 보안 설정">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="최대 로그인 시도 횟수" keyName="login_max_attempts" placeholder="5" />
              <InputField label="잠금 시간 (분)" keyName="login_lockout_min" placeholder="15" />
              <InputField label="세션 유효시간 (시간)" keyName="session_timeout_hour" placeholder="24" />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-xs text-red-700">
              <strong>주의:</strong> 보안 설정 변경 시 모든 관리자의 활성 세션에 영향을 줄 수 있습니다.
            </div>
          </SectionCard>

          <SectionCard icon={FileText} iconBg="rgba(37,99,235,0.1)" iconColor="var(--brand-blue)" title="서류발급 설정" desc="직원 서류발급센터 관련 설정">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="인증 유효시간 (분)" keyName="doc_auth_expiry_min" placeholder="3" />
              <div />
            </div>
            <div className="mt-4 space-y-1">
              <ToggleField label="데모 모드" desc="데모 모드에서는 인증번호를 화면에 직접 표시합니다" keyName="doc_demo_mode" />
            </div>
            <div className="mt-3 p-3 rounded-xl bg-blue-50 text-xs text-blue-700">
              <strong>안내:</strong> 실제 서비스 운영 시 데모 모드를 해제하고, 카카오 비즈니스 채널 및 SMS API를 연동하세요.
            </div>
          </SectionCard>
        </div>
      )}

      {/* Mobile Floating Save */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          설정 저장
        </button>
      </div>
    </div>
  );
}
