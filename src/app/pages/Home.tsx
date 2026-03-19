import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";
import { Link } from "react-router";
import {
  ArrowRight, ArrowUpRight, Factory, Users, GraduationCap, Building2,
  FileCheck, Headphones, MapPin, DollarSign, ChevronRight, Phone,
  Home as HomeIcon,
} from "lucide-react";
import * as api from "../lib/api";
import { HeroAnimation, ProductionCompactAnimation, TeamAnimation } from "../components/BusinessAnimations";
import { PartnersSection } from "../components/Partners";
import { useCompanyInfo, display } from "../components/CompanyInfoContext";
import { useSEO } from "../lib/useSEO";
import { handleError } from "../lib/error-handler";

/* ─── Animated counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function Home() {
  const { info } = useCompanyInfo();
  useSEO({ title: "더웰파트너", description: "30년 경험의 생산도급, 인력파견, 채용 전문 기업 더웰파트너입니다. 기업 맞춤형 인력 솔루션을 제공합니다." });
  const phone = display(info.phone, "031-XXX-XXXX");
  const [latestJobs, setLatestJobs] = useState<any[]>([]);
  const [latestNotices, setLatestNotices] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [jobRes, noticeRes, bannerRes] = await Promise.all([
          api.publicJobs.list(),
          api.publicApi.getNotices(),
          api.publicApi.getBanners(),
        ]);
        setLatestJobs((Array.isArray(jobRes) ? jobRes : []).slice(0, 3));
        setLatestNotices((Array.isArray(noticeRes) ? noticeRes : []).slice(0, 4));
        setBanners(Array.isArray(bannerRes) ? bannerRes : []);
      } catch (e) { handleError(e, { fallback: "데이터를 불러오는 데 실패했습니다.", silent: true }); }
    })();
  }, []);

  // Banner auto-slide
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="w-full">

      {/* ━━━ HERO — Deep Navy Tech ━━━ */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "linear-gradient(160deg, #0F172A 0%, #1E293B 100%)" }}>
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #3B82F6 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Gradient glow - top right */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, #60A5FA, transparent 70%)" }} />

        <div className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 py-32 md:py-0">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen lg:min-h-0 lg:py-32">

            {/* Left — Text */}
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-sm tracking-[0.2em] uppercase text-[#3B82F6] mb-6 font-semibold"
              >
                Production Outsourcing & Staffing
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-[2.5rem] sm:text-[3.5rem] md:text-[4rem] font-bold text-white leading-[1.1] tracking-[-0.03em] mb-7"
              >
                산업 현장의 성장을
                <br />
                함께 만들어 갑니다
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-lg md:text-xl text-[#94A3B8] leading-relaxed mb-10 max-w-lg"
              >
                제조·생산·물류·반도체 현장에
                <br className="sm:hidden" /> 최적화된 인력 운영 파트너
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2.5 px-8 py-4 bg-white text-[#0F172A] font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-white/10"
                >
                  기업 상담 신청
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/recruit"
                  className="inline-flex items-center gap-2.5 px-8 py-4 border border-white/15 text-white/90 font-medium rounded-full transition-all hover:bg-white/5 hover:border-white/25"
                >
                  채용공고 보기
                </Link>
              </motion.div>
            </div>

            {/* Right — Floating Glass Cards */}
            <div className="hidden lg:block relative h-[500px]">
              {/* Network lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400">
                <line x1="80" y1="100" x2="250" y2="160" stroke="#3B82F6" strokeWidth="0.5" />
                <line x1="250" y1="160" x2="320" y2="280" stroke="#3B82F6" strokeWidth="0.5" />
                <line x1="120" y1="300" x2="250" y2="160" stroke="#3B82F6" strokeWidth="0.5" />
                <line x1="80" y1="100" x2="320" y2="280" stroke="#3B82F6" strokeWidth="0.3" />
                <line x1="200" y1="60" x2="320" y2="280" stroke="#3B82F6" strokeWidth="0.3" />
                <line x1="120" y1="300" x2="350" y2="120" stroke="#3B82F6" strokeWidth="0.3" />
                <circle cx="80" cy="100" r="3" fill="#3B82F6" opacity="0.6" />
                <circle cx="250" cy="160" r="3" fill="#3B82F6" opacity="0.6" />
                <circle cx="320" cy="280" r="3" fill="#3B82F6" opacity="0.6" />
                <circle cx="120" cy="300" r="3" fill="#3B82F6" opacity="0.6" />
                <circle cx="200" cy="60" r="2" fill="#3B82F6" opacity="0.4" />
                <circle cx="350" cy="120" r="2" fill="#3B82F6" opacity="0.4" />
              </svg>

              {/* Glass Card 1 — Factory */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="absolute top-12 left-8 px-5 py-4 rounded-2xl border border-white/10 backdrop-blur-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Factory size={22} className="text-[#3B82F6] mb-2" />
                <div className="text-sm font-semibold text-white">생산도급</div>
                <div className="text-xs text-[#94A3B8]">Manufacturing</div>
              </motion.div>

              {/* Glass Card 2 — Users */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute top-32 right-4 px-5 py-4 rounded-2xl border border-white/10 backdrop-blur-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Users size={22} className="text-[#60A5FA] mb-2" />
                <div className="text-sm font-semibold text-white">인력파견</div>
                <div className="text-xs text-[#94A3B8]">Staffing</div>
              </motion.div>

              {/* Glass Card 3 — GraduationCap */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="absolute bottom-32 left-16 px-5 py-4 rounded-2xl border border-white/10 backdrop-blur-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <GraduationCap size={22} className="text-[#3B82F6] mb-2" />
                <div className="text-sm font-semibold text-white">교육훈련</div>
                <div className="text-xs text-[#94A3B8]">Training</div>
              </motion.div>

              {/* Glass Card 4 — Building */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="absolute bottom-12 right-16 px-5 py-4 rounded-2xl border border-white/10 backdrop-blur-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Building2 size={22} className="text-[#60A5FA] mb-2" />
                <div className="text-sm font-semibold text-white">시설관리</div>
                <div className="text-xs text-[#94A3B8]">Facility</div>
              </motion.div>

              {/* Center glow orb */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-30 blur-[80px]" style={{ background: "#3B82F6" }} />
            </div>

          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="border-t border-white/10 pt-8 pb-4 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { label: "설립", val: display(info.founded_year, "2019") + "년" },
              { label: "거래처", val: "50+", num: 50, suffix: "+" },
              { label: "운영 분야", val: "8개 분야" },
              { label: "현장 만족도", val: "98%", num: 98, suffix: "%" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                  {s.num ? <Counter target={s.num} suffix={s.suffix} /> : s.val}
                </div>
                <div className="text-sm text-[#94A3B8]">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━━ BANNER SLIDER ━━━ */}
      {banners.length > 0 && (
        <section className="relative bg-[var(--brand-section-alt)] overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              {banners.map((banner, i) => (
                <div
                  key={banner.id}
                  className={`transition-all duration-700 ${i === currentBanner ? "opacity-100" : "opacity-0 absolute inset-0"}`}
                >
                  <div className="flex flex-col md:flex-row items-center gap-8 py-10 md:py-14 px-5 sm:px-8">
                    {banner.image_url && (
                      <div className="w-full md:w-1/2 lg:w-2/5 flex-shrink-0">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          loading="lazy"
                          className="w-full h-48 md:h-64 object-cover rounded-2xl"
                        />
                      </div>
                    )}
                    <div className={`flex-1 ${!banner.image_url ? "text-center max-w-2xl mx-auto" : ""}`}>
                      <h3 className="text-2xl md:text-3xl font-bold text-[var(--brand-heading)] tracking-tight mb-3">{banner.title}</h3>
                      {banner.subtitle && <p className="text-[var(--brand-body-light)] leading-relaxed mb-5">{banner.subtitle}</p>}
                      {banner.link_url && (
                        <Link
                          to={banner.link_url}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-blue)] text-white font-semibold text-sm rounded-full hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                        >
                          자세히 보기 <ArrowRight size={15} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Banner dots */}
              {banners.length > 1 && (
                <div className="flex items-center justify-center gap-2 pb-6">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBanner(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${i === currentBanner ? "w-8 bg-[var(--brand-blue)]" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ━━━ SERVICES — Bento grid ━━━ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Services</p>
              <h2 className="text-3xl md:text-[2.75rem] font-bold text-[var(--brand-heading)] leading-tight tracking-[-0.02em]">
                사업 영역
              </h2>
            </div>
            <Link
              to="/business"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-blue)] hover:underline underline-offset-4"
            >
              전체 사업분야
              <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Factory,
                title: "생산/물류 도급",
                desc: "맞춤형 제조 라인 설계부터 전문 기술인력 투입까지, 생산 효율을 극대화합니다.",
                span: "lg:col-span-2",
                featured: true,
                hasAnimation: true,
              },
              {
                icon: Users,
                title: "인재파견",
                desc: "고객 맞춤형 인력 공급과 비용 절감, 운영 효율화를 동시에 실현합니다.",
              },
              {
                icon: GraduationCap,
                title: "컨설팅/교육훈련",
                desc: "기업 예비진단 분석 및 직무별 맞춤 교육훈련 프로그램을 운영합니다.",
              },
              {
                icon: Building2,
                title: "빌딩 종합관리",
                desc: "설비 통합관리, 정기점검, 시설관리 및 민원처리까지 원스톱 서비스.",
              },
              {
                icon: FileCheck,
                title: "급여/근태 관리",
                desc: "급여·근태·4대보험 처리까지 자동화된 원스톱 관리 시스템을 제공합니다.",
              },
              {
                icon: Headphones,
                title: "현장 운영 지원",
                desc: "투입 후 지속적인 관리와 대체인력 신속 대응 체계를 운영합니다.",
              },
            ].map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={service.span || ""}
              >
                <Link
                  to="/business"
                  className={`group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-gray-100 transition-all duration-300 hover:border-gray-200 hover:shadow-lg hover:shadow-black/[0.03] ${service.featured ? "h-[340px] md:h-[380px]" : "h-[220px] md:h-[260px] bg-[var(--brand-section-alt)]"}`}
                >
                  {service.hasAnimation && (
                    <>
                      <ProductionCompactAnimation className="absolute inset-0" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-hero-from)]/90 via-[var(--brand-hero-from)]/30 to-transparent" />
                    </>
                  )}
                  <div className={`relative p-7 ${service.hasAnimation ? "text-white" : ""}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${service.hasAnimation ? "bg-white/10 backdrop-blur-sm" : "bg-[var(--brand-sky)]"}`}>
                      <service.icon size={20} className={service.hasAnimation ? "text-white" : "text-[var(--brand-blue)]"} />
                    </div>
                    <h3 className={`text-lg font-bold mb-1.5 ${!service.hasAnimation ? "text-[var(--brand-heading)]" : ""}`}>
                      {service.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${service.hasAnimation ? "text-white/70" : "text-[var(--brand-body-light)]"}`}>
                      {service.desc}
                    </p>
                    <div className={`inline-flex items-center gap-1 text-sm font-medium mt-4 ${service.hasAnimation ? "text-white/80" : "text-[var(--brand-blue)]"}`}>
                      자세히
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ WHY — 핵심 강점 ━━━ */}
      <section className="py-24 md:py-32" style={{ backgroundColor: "var(--brand-section-alt)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left: Image composition */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <TeamAnimation />
            </motion.div>

            {/* Right: Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Why Us</p>
              <h2 className="text-3xl md:text-[2.5rem] font-bold text-[var(--brand-heading)] leading-tight tracking-[-0.02em] mb-6">
                기업이 핵심에만
                <br />집중할 수 있도록
              </h2>
              <p className="text-[var(--brand-body)] leading-relaxed mb-10">
                복잡한 인사·급여·근태·4대보험 관리를 더웰파트너가 대행합니다.
                고객사는 핵심 사업에만 온전히 집중할 수 있습니다.
              </p>

              <div className="space-y-5">
                {[
                  { title: "핵심량 강화", desc: "비핵심 업무를 위탁하여 내부 자원을 핵심 사업에 집중" },
                  { title: "코스트 절감", desc: "채용·교육·관리 비용 최소화로 총 운영비용 절감" },
                  { title: "리스크 분산", desc: "유연한 인력 운영으로 경영 리스크를 최소화" },
                  { title: "통합 관리", desc: "급여·근태·4대보험·연말정산까지 원스톱 처리" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--brand-heading)] mb-0.5">{item.title}</h4>
                      <p className="text-sm text-[var(--brand-body-light)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/service"
                className="group inline-flex items-center gap-2 mt-10 text-[var(--brand-blue)] font-semibold text-sm hover:underline underline-offset-4"
              >
                서비스 자세히 보기
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ━━━ PROCESS ━━━ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Process</p>
          <h2 className="text-3xl md:text-[2.5rem] font-bold text-[var(--brand-heading)] leading-tight tracking-[-0.02em] mb-16">
            서비스 프로세스
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
            {[
              { step: "01", title: "상담접수", desc: "고객 요구사항 심층 분석" },
              { step: "02", title: "인력선발", desc: "직무 맞춤형 인재 매칭" },
              { step: "03", title: "교육/배치", desc: "사전 교육 및 현장 배치" },
              { step: "04", title: "운영관리", desc: "급여/근태 통합 운영" },
              { step: "05", title: "사후관리", desc: "지속적 품질 모니터링" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white p-8 text-center"
              >
                <div className="text-[2.5rem] font-bold text-gray-100 leading-none mb-4">{s.step}</div>
                <h3 className="text-base font-bold text-[var(--brand-heading)] mb-1.5">{s.title}</h3>
                <p className="text-sm text-[var(--brand-body-light)]">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ INDUSTRIES ━━━ */}
      <section className="py-24 md:py-28" style={{ background: "linear-gradient(165deg, var(--brand-hero-from), var(--brand-hero-to))" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-cta)] mb-3">Industries</p>
              <h2 className="text-3xl md:text-[2.5rem] font-bold text-white leading-tight tracking-[-0.02em]">
                주요 운영 분야
              </h2>
            </div>
            <p className="text-white/40 max-w-sm text-sm leading-relaxed">
              다양한 산업 현장의 특성을 이해하고 최적화된 인력 운영 서비스를 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "자동차부품", "전자부품", "의료용품", "반도체장비",
              "미용용품", "물류/유통", "청소/경비", "일용직",
            ].map((name, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="group relative py-6 px-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-default"
              >
                <span className="text-xs text-white/25 font-medium">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-white font-semibold mt-2">{name}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ LATEST JOBS & NOTICES ━━━ */}
      {(latestJobs.length > 0 || latestNotices.length > 0) && (
        <section className="py-24 md:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
              {/* Jobs */}
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-1">Recruit</p>
                    <h2 className="text-2xl font-bold text-[var(--brand-heading)]">최신 채용공고</h2>
                  </div>
                  <Link to="/recruit" className="group text-sm font-medium text-[var(--brand-body-light)] hover:text-[var(--brand-blue)] flex items-center gap-1 transition-colors">
                    전체 보기 <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {latestJobs.map((job: any) => (
                    <Link
                      key={job.id}
                      to="/recruit"
                      className="group flex items-center justify-between gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--brand-sky)] text-[var(--brand-blue)]">
                            {job.employment_type}
                          </span>
                          <span className="text-xs text-[var(--brand-body-light)]">{job.job_category}</span>
                        </div>
                        <h3 className="font-semibold text-[var(--brand-heading)] truncate group-hover:text-[var(--brand-blue)] transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--brand-body-light)]">
                          <span className="flex items-center gap-1"><MapPin size={11} />{job.work_location}</span>
                          <span className="flex items-center gap-1"><DollarSign size={11} />{job.salary_min ? `월 ${(job.salary_min / 10000).toFixed(0)}만원~` : "협의"}</span>
                          {job.dormitory_available && <span className="flex items-center gap-1 text-[var(--brand-blue)]"><HomeIcon size={11} />기숙사</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-200 group-hover:text-[var(--brand-blue)] flex-shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Notices */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-1">Notice</p>
                    <h2 className="text-2xl font-bold text-[var(--brand-heading)]">공지사항</h2>
                  </div>
                  <Link to="/customer" className="group text-sm font-medium text-[var(--brand-body-light)] hover:text-[var(--brand-blue)] flex items-center gap-1 transition-colors">
                    전체 보기 <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {latestNotices.map((notice: any) => (
                    <Link
                      key={notice.id}
                      to="/customer"
                      className="group block px-5 py-4 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {notice.is_pinned && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--brand-blue)] text-white flex-shrink-0 mt-0.5">
                            중요
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-[var(--brand-heading)] truncate group-hover:text-[var(--brand-blue)] transition-colors">
                            {notice.title}
                          </h4>
                          <span className="text-xs text-[var(--brand-body-light)]">{notice.created_at?.split("T")[0]}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {latestNotices.length === 0 && (
                    <div className="p-10 text-center text-sm text-[var(--brand-body-light)]">등록된 공지사항이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ━━━ PARTNERS ━━━ */}
      <PartnersSection />

      {/* ━━━ CTA ━━━ */}
      <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: "linear-gradient(165deg, var(--brand-hero-from), var(--brand-hero-to))" }}>
        {/* Grain */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "128px" }} />
        
        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-[2.75rem] font-bold text-white leading-tight tracking-[-0.02em] mb-5">
              맞춤 인력 솔루션이
              <br />필요하신가요?
            </h2>
            <p className="text-lg text-white/50 mb-10 max-w-md mx-auto">
              상담부터 운영까지 더웰파트너가 함께합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[var(--brand-heading)] font-semibold rounded-full transition-all hover:bg-white/90"
              >
                무료 상담 신청
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/15 text-white font-medium rounded-full transition-all hover:bg-white/5 hover:border-white/25"
              >
                <Phone size={16} />
                {phone}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}