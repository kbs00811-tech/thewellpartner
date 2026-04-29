import { Link, useLocation, Outlet } from "react-router";
import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ADMIN_BASE } from "../constants";
import { validatePasswordStrength } from "../lib/security";
import {
  LayoutDashboard, Globe, Briefcase, Users, MessageSquare, FileText, BarChart3,
  Settings, ChevronDown, Menu, LogOut, User, UserCog, FolderOpen,
  ClipboardList, Building2, Image, HelpCircle, Megaphone, UserCheck, Database,
  TrendingUp, FileCheck, Shield, History, KeyRound, MonitorSmartphone, Factory,
  MapPin, ArrowLeftRight, CalendarCheck, Globe2, FileSpreadsheet, Lock,
  X, Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { LogoIcon } from "./Logo";
import { TableSkeleton } from "./PageSkeleton";
import { Suspense } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface MenuItem {
  name: string;
  path?: string;
  icon: any;
  badge?: number;
  children?: { name: string; path: string; icon?: any }[];
  permKey?: string;
  badgeKey?: string;
}

const A = ADMIN_BASE;
const menuItems: MenuItem[] = [
  { name: "대시보드", path: A, icon: LayoutDashboard },
  {
    name: "홈페이지 관리", icon: Globe, permKey: "website",
    children: [
      { name: "메인 배너 관리", path: `${A}/website/banners`, icon: Image },
      { name: "회사소개 관리", path: `${A}/website/about`, icon: Building2 },
      { name: "사업분야 관리", path: `${A}/website/business`, icon: Briefcase },
      { name: "공지사항", path: `${A}/website/notices`, icon: Megaphone },
      { name: "FAQ", path: `${A}/website/faq`, icon: HelpCircle },
      { name: "자료실", path: `${A}/website/materials`, icon: FolderOpen },
    ],
  },
  {
    name: "채용 관리", icon: Briefcase, permKey: "recruit", badgeKey: "applicants",
    children: [
      { name: "채용공고 관리", path: `${A}/recruit`, icon: ClipboardList },
      { name: "지원자 관리", path: `${A}/applicants`, icon: UserCheck },
      { name: "인재풀 관리", path: `${A}/talent-pool`, icon: Database },
      { name: "채용 통계", path: `${A}/recruit/stats`, icon: TrendingUp },
    ],
  },
  {
    name: "문의 관리", icon: MessageSquare, permKey: "inquiries", badgeKey: "inquiries",
    children: [
      { name: "기업 문의", path: `${A}/inquiries?type=company`, icon: Building2 },
      { name: "구직자 문의", path: `${A}/inquiries?type=jobseeker`, icon: User },
      { name: "전체 문의", path: `${A}/inquiries`, icon: MessageSquare },
    ],
  },
  {
    name: "서류발급 관리", icon: FileText, permKey: "documents",
    children: [
      { name: "직원 정보 관리", path: `${A}/employees`, icon: Users },
      { name: "서류 템플릿", path: `${A}/documents/templates`, icon: FolderOpen },
      { name: "급여명세서 관리", path: `${A}/documents/payslips`, icon: FileCheck },
      { name: "발급 로그", path: `${A}/documents/logs`, icon: History },
    ],
  },
  { name: "통계/리포트", path: `${A}/statistics`, icon: BarChart3, permKey: "statistics" },
  {
    name: "ERP 인력운영", icon: Factory, permKey: "erp",
    children: [
      { name: "고객사 관리", path: `${A}/erp/clients`, icon: Building2 },
      { name: "현장 관리", path: `${A}/erp/sites`, icon: MapPin },
      { name: "배치 관리", path: `${A}/erp/placements`, icon: ArrowLeftRight },
      { name: "근태 관리", path: `${A}/erp/attendance`, icon: CalendarCheck },
      { name: "급여명세서", path: `${A}/payroll`, icon: FileSpreadsheet },
      { name: "정산 관리", path: `${A}/settlement`, icon: TrendingUp },
      { name: "계약·청구 양식", path: `${A}/contract-docs`, icon: FileText },
      { name: "PDF/Excel 자동 임포트", path: `${A}/billing-import`, icon: FileSpreadsheet },
    ],
  },
  {
    name: "외국인 인력관리", icon: Globe2, permKey: "foreign",
    children: [
      { name: "현황 대시보드", path: `${A}/erp/foreign`, icon: BarChart3 },
      { name: "비자 관리", path: `${A}/erp/foreign/visa`, icon: FileText },
      { name: "체류 기록", path: `${A}/erp/foreign/stay`, icon: CalendarCheck },
    ],
  },
  {
    name: "회원/권한 관리", icon: Shield, permKey: "users",
    children: [
      { name: "관리자 계정", path: `${A}/users`, icon: UserCog },
      { name: "권한 그룹", path: `${A}/permissions`, icon: KeyRound },
      { name: "접속 로그", path: `${A}/access-logs`, icon: MonitorSmartphone },
    ],
  },
  { name: "시스템 설정", path: `${A}/settings`, icon: Settings, permKey: "settings" },
];

function SidebarItem({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = item.path
    ? location.pathname === item.path
    : item.children?.some((c) => location.pathname + location.search === c.path || location.pathname === c.path.split("?")[0]);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            isActive ? "bg-[var(--brand-sky)] text-[var(--brand-blue)]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`}
        >
          <item.icon size={18} className="flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.name}</span>
              {!!item.badge && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{item.badge}</span>}
              <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
            {item.children.map((child) => {
              const childActive = location.pathname + location.search === child.path || location.pathname === child.path.split("?")[0];
              return (
                <Link key={child.name} to={child.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    childActive ? "text-[var(--brand-blue)] font-semibold bg-[var(--brand-sky)]/50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {child.icon && <child.icon size={14} />}
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to={item.path!}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        isActive ? "bg-[var(--brand-sky)] text-[var(--brand-blue)]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      }`}
    >
      <item.icon size={18} className="flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.name}</span>
          {!!item.badge && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{item.badge}</span>}
        </>
      )}
    </Link>
  );
}

/* ─── 비밀번호 변경 모달 ─── */
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pwStrengthErrors, setPwStrengthErrors] = useState<string[]>([]);

  const reset = () => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); setError(""); setSuccess(false); setShowCurrent(false); setShowNew(false); setPwStrengthErrors([]); };

  const handleNewPwChange = (value: string) => {
    setNewPw(value);
    if (value.length > 0) {
      const strength = validatePasswordStrength(value);
      setPwStrengthErrors(strength.errors);
    } else {
      setPwStrengthErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const strength = validatePasswordStrength(newPw);
    if (!strength.valid) { setError(strength.errors.join(", ")); return; }
    if (newPw !== confirmPw) { setError("새 비밀번호가 일치하지 않습니다."); return; }
    if (currentPw === newPw) { setError("현재 비밀번호와 다른 비밀번호를 입력해주세요."); return; }

    setSaving(true);
    try {
      await api.changePassword(currentPw, newPw);
      setSuccess(true);
      setTimeout(() => { reset(); onClose(); }, 1500);
    } catch (e: any) { setError(e.message || "비밀번호 변경에 실패했습니다."); }
    finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="비밀번호 변경">
      <div className="absolute inset-0 bg-black/30" onClick={() => { reset(); onClose(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}>
              <Lock size={18} style={{ color: "var(--brand-blue)" }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>비밀번호 변경</h3>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="닫기"><X size={18} /></button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
            <p className="font-semibold text-green-600">비밀번호가 변경되었습니다!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">현재 비밀번호</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)]" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="비밀번호 표시">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">새 비밀번호 <span className="text-gray-400 font-normal">(영문+숫자, 8자 이상)</span></label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPw} onChange={(e) => handleNewPwChange(e.target.value)} required minLength={8} autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)]" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="비밀번호 표시">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwStrengthErrors.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">{pwStrengthErrors.join(", ")}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">새 비밀번호 확인</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-sky)] ${
                  confirmPw && confirmPw !== newPw ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[var(--brand-blue)]"
                }`} />
              {confirmPw && confirmPw !== newPw && <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>}
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</div>}
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
              style={{ backgroundColor: "var(--brand-blue)" }}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<any>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const { user, isSessionExpiring, handleLogout } = useAuth({
    onExpired: () => {
      window.location.href = `${A}/login?expired=1`;
    },
  });

  useEffect(() => {
    api.getBadgeCounts().then((res: any) => setBadgeCounts(res)).catch(() => {});
  }, []);

  // 모바일 사이드바 열림 시 body 스크롤 락
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }
    return () => document.body.classList.remove("sidebar-open");
  }, [mobileSidebarOpen]);

  // 라우트 변경 시 모바일 사이드바 자동 닫힘
  const location = useLocation();
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const itemsWithBadges = menuItems.map((item) => ({
    ...item,
    badge: item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0,
  }));

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Session expiring warning */}
        {isSessionExpiring && (
          <div className="fixed top-0 left-0 right-0 z-[90] bg-amber-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            세션이 곧 만료됩니다. 작업을 저장해주세요.
          </div>
        )}

        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${sidebarOpen ? "w-64" : "w-[70px]"} ${isSessionExpiring ? "mt-10 lg:mt-10" : ""}`}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
            <Link to={ADMIN_BASE} className="flex items-center gap-2">
              <LogoIcon className="w-8 h-8" />
              {sidebarOpen && <span className="font-bold text-sm" style={{ color: "var(--brand-navy)" }}>더웰파트너</span>}
            </Link>
            <button className="hidden lg:block p-1 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="사이드바 토글">
              <Menu size={18} />
            </button>
            <button className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => setMobileSidebarOpen(false)} aria-label="메뉴 닫기">
              <X size={18} />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation" aria-label="관리자 메뉴">
            {itemsWithBadges.map((item) => (
              <SidebarItem key={item.name} item={item} collapsed={!sidebarOpen} />
            ))}
          </nav>

          {/* User info */}
          {sidebarOpen && user && (
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "var(--brand-blue)" }}>
                  {(user.name || "A")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-400">{user.role === "SUPER_ADMIN" ? "최고관리자" : "관리자"}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className={`flex-1 flex flex-col min-w-0 ${isSessionExpiring ? "mt-10" : ""}`}>
          {/* Top bar */}
          <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500" onClick={() => setMobileSidebarOpen(true)} aria-label="메뉴 열기">
                <Menu size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPasswordModal(true)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="비밀번호 변경" aria-label="비밀번호 변경">
                <Lock size={18} />
              </button>
              <Link to="/" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="홈페이지 보기" target="_blank" rel="noopener noreferrer" aria-label="홈페이지 새 탭에서 열기">
                <Globe size={18} />
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut size={16} />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </header>

          {/* Page content with ErrorBoundary */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="animate-pulse space-y-4 mb-6">
                    <div className="w-48 h-7 bg-gray-200 rounded" />
                    <div className="w-80 h-4 bg-gray-100 rounded" />
                  </div>
                  <TableSkeleton rows={6} cols={5} />
                </div>
              }>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  );
}
