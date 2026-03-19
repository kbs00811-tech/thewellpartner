import { Link } from "react-router";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { useCompanyInfo, display } from "./CompanyInfoContext";

/* ─── Social SVG Icons (inline for zero-dependency) ─── */
function BlogIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
    </svg>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
    </svg>
  );
}

function KakaoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c5.8 0 10.5 3.66 10.5 8.18 0 4.52-4.7 8.18-10.5 8.18-.87 0-1.72-.08-2.53-.24l-3.17 2.15a.5.5 0 0 1-.77-.5l.72-3.2C3.78 15.87 1.5 13.25 1.5 11.18 1.5 6.66 6.2 3 12 3z"/>
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

interface SocialLink {
  key: string;
  url: string;
  label: string;
  icon: React.ReactNode;
}

export function Footer() {
  const { info } = useCompanyInfo();

  const linkGroups = [
    {
      title: "회사",
      links: [
        { name: "회사소개", path: "/about" },
        { name: "사업분야", path: "/business" },
        { name: "서비스", path: "/service" },
        { name: "채용정보", path: "/recruit" },
      ],
    },
    {
      title: "고객지원",
      links: [
        { name: "고객센터", path: "/customer" },
        { name: "문의하기", path: "/contact" },
        { name: "서류발급센터", path: "/docs" },
        { name: "사원등록", path: "/register" },
      ],
    },
  ];

  const companyName = display(info.company_name, "더웰파트너");
  const phone = display(info.phone, "031-XXX-XXXX");
  const email = display(info.email, "contact@thewellpartner.com");
  const address = display(info.address, "경기도 수원시 (본사)");
  const ceoName = display(info.ceo_name, "OOO");
  const businessNo = display(info.business_no, "XXX-XX-XXXXX");
  const businessHours = display(info.business_hours, "평일 09:00 ~ 18:00 (공휴일 제외)");

  // Build social links dynamically from CompanyInfo
  const socialLinks: SocialLink[] = [
    { key: "blog", url: info.social_blog, label: "블로그", icon: <BlogIcon size={15} /> },
    { key: "instagram", url: info.social_instagram, label: "Instagram", icon: <InstagramIcon size={15} /> },
    { key: "youtube", url: info.social_youtube, label: "YouTube", icon: <YoutubeIcon size={15} /> },
    { key: "facebook", url: info.social_facebook, label: "Facebook", icon: <FacebookIcon size={15} /> },
    { key: "kakao", url: info.social_kakao_channel, label: "카카오톡 채널", icon: <KakaoIcon size={15} /> },
    { key: "linkedin", url: info.social_linkedin, label: "LinkedIn", icon: <LinkedInIcon size={15} /> },
  ].filter((s) => s.url && s.url.trim());

  return (
    <footer className="bg-[var(--brand-navy)] text-gray-400">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Top */}
        <div className="py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Logo variant="dark" size="md" />
            <p className="mt-5 text-sm text-gray-500 leading-relaxed max-w-xs">
              제조·생산·물류·반도체·안전감시 등
              다양한 산업 현장에 최적화된
              인재 운영 서비스를 제공합니다.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                <MapPin size={14} className="flex-shrink-0 text-gray-600" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="flex-shrink-0 text-gray-600" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="flex-shrink-0 text-gray-600" />
                <span>{email}</span>
              </div>
            </div>

            {/* Social Links — dynamic from AdminSettings */}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-gray-500 hover:text-white transition-all"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          {linkGroups.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h4 className="text-white text-sm font-semibold mb-5">{group.title}</h4>
              <ul className="space-y-3 text-sm">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact card */}
          <div className="lg:col-span-3">
            <h4 className="text-white text-sm font-semibold mb-5">상담 안내</h4>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-5">
              <p className="text-sm text-gray-500 mb-3">
                {businessHours}
              </p>
              <Link
                to="/contact"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-cta)] hover:text-[var(--brand-cta-light)] transition-colors"
              >
                상담 신청하기
                <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="py-6 border-t border-white/[0.05]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-600">
            <div className="text-center md:text-left">
              <span>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</span>
              <span className="hidden md:inline mx-2">&middot;</span>
              <span className="block md:inline">대표이사: {ceoName} | 사업자등록번호: {businessNo}</span>
            </div>
            <div className="flex gap-5">
              <Link to="/privacy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
              <Link to="/terms" className="hover:text-gray-400 transition-colors">이용약관</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
