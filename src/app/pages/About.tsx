import { useState, useEffect } from "react";
import { Target, Users, Award, TrendingUp, MapPin, Phone, Mail, Building, Calendar, Globe } from "lucide-react";
import { motion } from "motion/react";
import { PartnershipAnimation } from "../components/BusinessAnimations";
import { PageHero } from "../components/shared";
import { useCompanyInfo, display } from "../components/CompanyInfoContext";
import * as api from "../lib/api";
import { useSEO } from "../lib/useSEO";

/* ─── 기본값(fallback) 파싱 헬퍼 ─── */
function parseHistory(raw: string, companyName: string): { year: string; event: string }[] {
  if (!raw) return [
    { year: "2019", event: `${companyName} 법인 설립 (수원 본사)` },
    { year: "2020", event: "제조/생산 도급 사업 본격 운영 개시" },
    { year: "2021", event: "인재파견 서비스 런칭, 거래처 20개 달성" },
    { year: "2022", event: "컨설팅/교육훈련 서비스 추가" },
    { year: "2023", event: "화성 지사 설립, 운영 분야 8개로 확대" },
    { year: "2024", event: "급여/근태 통합 관리 시스템 도입" },
  ];
  return raw.split("\n").filter(Boolean).map((line) => {
    const [year, ...rest] = line.split("|");
    return { year: year.trim(), event: rest.join("|").trim() || year.trim() };
  });
}

function parseCoreValues(raw: string): { title: string; description: string }[] | null {
  if (!raw) return null;
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length === 0) return null;
  return lines.map((line) => {
    const [title, ...desc] = line.split("|");
    return { title: title.trim(), description: desc.join("|").trim() || "" };
  });
}

function parseCeoGreeting(raw: string, companyName: string): string[] {
  if (!raw) return [
    `${companyName}를 찾아주신 여러분을 진심으로 환영합니다.`,
    `${companyName}는 생산도급 및 생산 인력 채용 전문기업으로, 제조, 생산, 물류, 사무, 반도체, 안전감시 등 다양한 산업 현장에 최적화된 인재 운영 서비스를 제공하고 있습니다.`,
    `저희는 단순히 인력을 공급하는 것이 아니라, 기업의 핵심 경쟁력을 강화하고 비용을 절감하며, 리스크를 최소화하는 종합 솔루션을 제공합니다.`,
    `체계적인 교육 시스템과 사후관리 체계를 통해 고객사와 근로자 모두가 만족하는 win-win 파트너십을 구축하겠습니다.`,
  ];
  return raw.split("\n").filter(Boolean);
}

const DEFAULT_ICONS = [Target, Users, Award, TrendingUp];
const DEFAULT_VALUES = [
  { title: "전문성", description: "산업 현장에 대한 깊은 이해와 전문 지식으로 최적의 솔루션을 제공합니다." },
  { title: "파트너십", description: "고객과 함께 성장하는 진정한 비즈니스 파트너로서의 관계를 지향합니다." },
  { title: "신뢰성", description: "약속을 지키는 책임감 있는 서비스로 장기적인 신뢰를 구축합니다." },
  { title: "혁신", description: "지속적인 개선과 혁신적 시스템 도입으로 서비스 품질을 높입니다." },
];

export default function About() {
  const { info } = useCompanyInfo();
  const [siteContent, setSiteContent] = useState<any>(null);
  useSEO({ title: "회사소개", description: "더웰파트너의 CEO 인사말, 핵심가치, 연혁을 확인하세요. 생산도급 및 인력 채용 전문기업입니다." });

  useEffect(() => {
    api.publicApi.getSiteContent("about").then((data) => {
      if (data && Object.keys(data).length > 0) setSiteContent(data);
    }).catch(() => {});
  }, []);

  const companyName = display(info.company_name, "더웰파트너");
  const ceoName = siteContent?.ceoName || display(info.ceo_name, "OOO");
  const businessNo = display(info.business_no, "XXX-XX-XXXXX");
  const phone = display(info.phone, "031-XXX-XXXX");
  const email = display(info.email, "contact@thewellpartner.com");
  const address = display(info.address, "경기도 수원시 OO구 OO로 123");
  const foundedYear = display(info.founded_year, "2019년");
  const branchAddress = display(info.branch_address, "경기도 화성시 OO구 OO로 456");
  const branchPhone = display(info.branch_phone, "031-YYY-YYYY");
  const branchEmail = display(info.branch_email, "hwaseong@thewellpartner.com");

  const milestones = parseHistory(siteContent?.history || "", companyName);
  const greetingParagraphs = parseCeoGreeting(siteContent?.ceoGreeting || "", companyName);
  const customValues = parseCoreValues(siteContent?.coreValues || "");
  const values = customValues
    ? customValues.map((v, i) => ({ icon: DEFAULT_ICONS[i % DEFAULT_ICONS.length], ...v }))
    : DEFAULT_VALUES.map((v, i) => ({ icon: DEFAULT_ICONS[i], ...v }));

  return (
    <div className="w-full">
      <PageHero
        label="About Us"
        title="회사소개"
        subtitle="현장에 맞는 인재 운영과 체계적인 관리 시스템을 제공하는 신뢰의 파트너"
      />

      {/* CEO Message */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <PartnershipAnimation />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">CEO Message</p>
              <h2 className="text-3xl md:text-[2.25rem] font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-6">
                대표 인사말
              </h2>
              <div className="space-y-4 text-[var(--brand-body)] leading-relaxed">
                {greetingParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 font-semibold text-[var(--brand-heading)]">
                {companyName} 대표이사 <span className="text-[var(--brand-blue)]">{ceoName}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-24 md:py-32" style={{ backgroundColor: "var(--brand-section-alt)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Overview</p>
          <h2 className="text-3xl md:text-[2.25rem] font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-12">회사개요</h2>
          {siteContent?.companyOverview && (
            <p className="text-[var(--brand-body)] leading-relaxed mb-10 max-w-3xl">{siteContent.companyOverview}</p>
          )}
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {[
              [
                { label: "회사명", value: companyName, icon: Building },
                { label: "대표이사", value: ceoName, icon: Users },
                { label: "설립일", value: foundedYear, icon: Calendar },
                { label: "사업자등록번호", value: businessNo, icon: Award },
              ],
              [
                { label: "본사", value: address.split(" ").slice(0, 2).join(" ") || "경기도 수원시", icon: MapPin },
                { label: "지사", value: branchAddress.split(" ").slice(0, 2).join(" ") || "경기도 화성시", icon: Globe },
                { label: "대표전화", value: phone, icon: Phone },
                { label: "이메일", value: email, icon: Mail },
              ],
            ].map((group, gi) => (
              <div key={gi} className="bg-white rounded-2xl p-8 border border-gray-100 space-y-5">
                {group.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-sky)] flex items-center justify-center flex-shrink-0">
                      <item.icon size={17} className="text-[var(--brand-blue)]" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--brand-body-light)] mb-0.5">{item.label}</div>
                      <div className="font-semibold text-[var(--brand-heading)]">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">History</p>
          <h2 className="text-3xl md:text-[2.25rem] font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-14">연혁</h2>
          <div className="max-w-2xl">
            {milestones.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="flex gap-6 mb-8 last:mb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-xl bg-[var(--brand-heading)] flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                    {m.year}
                  </div>
                  {i < milestones.length - 1 && <div className="w-px flex-1 mt-2 bg-gray-100" />}
                </div>
                <div className="pt-3.5 pb-6">
                  <p className="font-medium text-[var(--brand-heading)]">{m.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 md:py-32" style={{ backgroundColor: "var(--brand-section-alt)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Core Values</p>
          <h2 className="text-3xl md:text-[2.25rem] font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-12">핵심 가치</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-heading)] flex items-center justify-center mb-5">
                  <v.icon className="text-white" size={22} />
                </div>
                <h3 className="text-lg font-bold text-[var(--brand-heading)] mb-2">{v.title}</h3>
                <p className="text-sm text-[var(--brand-body-light)] leading-relaxed">{v.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Location</p>
          <h2 className="text-3xl md:text-[2.25rem] font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-12">오시는 길</h2>
          <div className="grid lg:grid-cols-2 gap-5">
            {[
              { name: "본사 (수원)", address: address, phone: phone, email: email },
              { name: "지사 (화성)", address: branchAddress, phone: branchPhone, email: branchEmail },
            ].map((office, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:shadow-black/[0.03] transition-shadow"
              >
                <h3 className="text-xl font-bold text-[var(--brand-heading)] mb-6">{office.name}</h3>
                <div className="space-y-4">
                  {[
                    { icon: MapPin, label: "주소", value: office.address },
                    { icon: Phone, label: "전화", value: office.phone },
                    { icon: Mail, label: "이메일", value: office.email },
                  ].map((item, j) => (
                    <div key={j} className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-[var(--brand-sky)] flex items-center justify-center flex-shrink-0">
                        <item.icon size={15} className="text-[var(--brand-blue)]" />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--brand-body-light)] mb-0.5">{item.label}</div>
                        <div className="text-sm font-medium text-[var(--brand-heading)]">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}