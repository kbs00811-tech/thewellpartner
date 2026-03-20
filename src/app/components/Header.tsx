import { Link, useLocation } from "react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "./Logo";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpandedItem, setMobileExpandedItem] = useState<string | null>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileExpandedItem(null);
  }, [location]);

  // ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // Trap focus inside mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setMobileExpandedItem(null);
  }, []);

  const navigation = [
    {
      name: "회사소개",
      path: "/about",
      children: [
        { name: "CEO 인사말", path: "/about" },
        { name: "핵심가치", path: "/about" },
        { name: "오시는 길", path: "/about" },
      ],
    },
    {
      name: "사업분야",
      path: "/business",
      children: [
        { name: "생산/물류 도급", path: "/business" },
        { name: "인재파견", path: "/business" },
        { name: "컨설팅/교육", path: "/business" },
        { name: "빌딩 종합관리", path: "/business" },
      ],
    },
    { name: "서비스", path: "/service" },
    { name: "채용정보", path: "/recruit" },
    {
      name: "고객센터",
      path: "/customer",
      children: [
        { name: "공지사항", path: "/customer" },
        { name: "FAQ", path: "/customer" },
      ],
    },
    { name: "서류발급", path: "/docs" },
    { name: "사원등록", path: "/register" },
  ];

  const isTransparent = isHome && !isScrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent
          ? "bg-transparent"
          : "bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/[0.06]"
      }`}
      role="banner"
    >
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-[var(--brand-blue)] focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-semibold"
      >
        본문 바로가기
      </a>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0" aria-label="더웰파트너 홈">
            <Logo variant={isTransparent ? "light" : "dark"} size="md" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="주 메뉴">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.children && setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center gap-0.5 px-3.5 py-2 rounded-lg text-[0.9rem] font-medium transition-colors duration-200 ${
                      isTransparent
                        ? "text-[#475569] hover:text-[#0F172A] hover:bg-[#0F172A]/[0.04]"
                        : "text-[#94A3B8] hover:text-white hover:bg-white/[0.06]"
                    } ${isActive ? (isTransparent ? "!text-[#0284C7]" : "!text-white") : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-haspopup={item.children ? "true" : undefined}
                    aria-expanded={item.children ? activeDropdown === item.name : undefined}
                  >
                    {item.name}
                    {item.children && (
                      <ChevronDown
                        size={13}
                        className={`ml-0.5 transition-transform ${activeDropdown === item.name ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    )}
                  </Link>

                  <AnimatePresence>
                    {item.children && activeDropdown === item.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 pt-2 min-w-[160px]"
                        role="menu"
                        aria-label={`${item.name} 하위 메뉴`}
                      >
                        <div className={`rounded-xl shadow-lg py-1.5 overflow-hidden ${
                          isTransparent
                            ? "bg-white border border-gray-100 shadow-black/[0.06]"
                            : "bg-[#1E293B] border border-white/[0.08] shadow-black/20"
                        }`}>
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              to={child.path}
                              className={`block px-4 py-2.5 text-sm transition-colors ${
                                isTransparent
                                  ? "text-[#475569] hover:text-[#0284C7] hover:bg-[#F0F9FF]"
                                  : "text-[#94A3B8] hover:text-white hover:bg-white/[0.06]"
                              }`}
                              role="menuitem"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* CTA */}
          <div className="hidden lg:block">
            <Link
              to="/contact"
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                isTransparent
                  ? "bg-[#0284C7] text-white hover:bg-[#0369A1] hover:shadow-lg hover:shadow-[#0284C7]/20"
                  : "bg-white text-[#0F172A] hover:bg-white/90 hover:shadow-lg hover:shadow-white/10"
              }`}
            >
              상담 신청
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Mobile menu btn */}
          <button
            ref={menuButtonRef}
            className="lg:hidden p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ color: isTransparent ? "#0F172A" : "#ffffff" }}
            aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 top-[72px] bg-black/20 z-40"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            <motion.div
              ref={mobileMenuRef}
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden bg-[#0F172A] border-t border-white/[0.06] overflow-hidden relative z-50 max-h-[calc(100vh-72px)] overflow-y-auto"
              role="dialog"
              aria-label="모바일 메뉴"
            >
              <nav className="px-5 py-4 space-y-0.5" aria-label="모바일 메뉴">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.path;
                  const isExpanded = mobileExpandedItem === item.name;

                  return (
                    <div key={item.name}>
                      {item.children ? (
                        <>
                          <div className="flex items-center">
                            <Link
                              to={item.path}
                              className={`flex-1 py-3 px-4 rounded-lg text-[0.95rem] font-medium transition-colors ${
                                isActive
                                  ? "text-white bg-white/[0.08]"
                                  : "text-[#94A3B8] hover:bg-white/[0.04]"
                              }`}
                              onClick={closeMobileMenu}
                              aria-current={isActive ? "page" : undefined}
                            >
                              {item.name}
                            </Link>
                            <button
                              onClick={() => setMobileExpandedItem(isExpanded ? null : item.name)}
                              className="p-3 rounded-lg hover:bg-white/[0.04] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand-blue)]"
                              aria-label={`${item.name} 하위 메뉴 ${isExpanded ? "접기" : "펼치기"}`}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown
                                size={16}
                                className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-6 pb-1 space-y-0.5">
                                  {item.children.map((child) => (
                                    <Link
                                      key={child.name}
                                      to={child.path}
                                      className="block py-2.5 px-4 rounded-lg text-sm text-[#64748B] hover:text-white hover:bg-white/[0.04] transition-colors"
                                      onClick={closeMobileMenu}
                                    >
                                      {child.name}
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <Link
                          to={item.path}
                          className={`block py-3 px-4 rounded-lg text-[0.95rem] font-medium transition-colors ${
                            isActive
                              ? "text-white bg-white/[0.08]"
                              : "text-[#94A3B8] hover:bg-white/[0.04]"
                          }`}
                          onClick={closeMobileMenu}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.name}
                        </Link>
                      )}
                    </div>
                  );
                })}
                <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-2">
                  <Link to="/contact" onClick={closeMobileMenu}>
                    <button className="w-full py-3 rounded-full text-[#0F172A] font-semibold bg-white hover:bg-white/90 transition-colors">
                      기업 상담 신청
                    </button>
                  </Link>
                  <Link to="/recruit" onClick={closeMobileMenu}>
                    <button className="w-full py-3 rounded-full font-semibold border border-white/15 text-white/90 hover:bg-white/[0.04] transition-colors">
                      채용공고 보기
                    </button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
