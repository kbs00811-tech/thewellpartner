import { useState, useEffect } from "react";
import { Factory, Users, GraduationCap, Building2 } from "lucide-react";
import { motion } from "motion/react";
import { PageHero, CtaSection } from "../components/shared";
import * as api from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { JOB_CATEGORIES } from "../constants";

const DEFAULT_BUSINESSES = [
  {
    key: "production",
    icon: Factory,
    title: "생산/물류 도급",
    description: "맞춤형 제조 라인 시스템 설계 및 전문 기술인력 투입으로 생산 효율을 극대화합니다. 고객사의 생산 목표에 맞춘 최적의 라인 운영 솔루션을 제공합니다.",
    image: "/images/business/production.png",
    features: ["맞춤형 서비스 설계", "제조 라인 시스템 구축", "전문 기술인력 투입", "지속적인 관리 및 사후관리"],
  },
  {
    key: "staffing",
    icon: Users,
    title: "인재파견",
    description: "고객 맞춤형 인력 공급과 비용 절감, 운영 효율화를 동시에 실현합니다. 즉각적인 인력 수요에 대응하여 최적의 인재를 신속하게 배치합니다.",
    image: "/images/business/staffing.png",
    features: ["고객 맞춤형 인력 공급", "비용 절감 및 효율화", "운영 리스크 최소화", "유연한 인력 운영"],
  },
  {
    key: "consulting",
    icon: GraduationCap,
    title: "컨설팅/교육훈련",
    description: "기업 예비진단 분석 및 맞춤 교육훈련 프로그램을 제공합니다. 법정 의무교육부터 직무별 전문 교육까지 체계적으로 운영합니다.",
    image: "/images/business/consulting.png",
    features: ["기업 예비진단 및 분석", "법정 의무교육 실시", "맞춤 교육훈련 수립", "교육 후 개선안 반영"],
  },
  {
    key: "building",
    icon: Building2,
    title: "빌딩 종합관리",
    description: "빌딩설비 및 시스템 통합관리, 정기점검 및 민원처리까지 원스톱으로 제공합니다. 건물 가치를 보전하는 전문 관리 서비스입니다.",
    image: "/images/business/building.png",
    features: ["빌딩설비 통합관리", "정기 점검 및 유지보수", "회계처리 및 관리비 부과", "민원 및 고충 처리"],
  },
];

export default function Business() {
  const [siteContent, setSiteContent] = useState<any>(null);
  useSEO({ title: "사업분야", description: "더웰파트너의 생산/물류 도급, 인재파견, 컨설팅/교육, 빌딩 종합관리 등 핵심 사업분야를 확인하세요." });

  useEffect(() => {
    api.publicApi.getSiteContent("business").then((data) => {
      if (data && Object.keys(data).length > 0) setSiteContent(data);
    }).catch(() => {});
  }, []);

  // 서버 콘텐츠가 있으면 description 덮어쓰기
  const businesses = DEFAULT_BUSINESSES.map((biz) => {
    const serverDesc = siteContent?.[biz.key];
    return serverDesc ? { ...biz, description: serverDesc } : biz;
  });

  const JOB_CAT_DESCRIPTIONS: Record<string, string> = {
    "제조/생산": "생산라인 작업, 조립, 포장 등",
    "물류/유통": "입출고, 피킹, 배송 지원 등",
    "사무직": "일반 사무, 경리, 인사 등",
    "반도체": "반도체 제조, 검사, 장비 관리",
    "안전감시": "안전관리, 보안, 시설관리",
    "경비/청소": "건물 관리, 미화, 경비",
    "기타": "기타 분야",
  };
  const jobCategories = JOB_CATEGORIES.map((name) => ({
    name,
    description: JOB_CAT_DESCRIPTIONS[name] || name,
  }));

  return (
    <div className="w-full">
      {/* Hero */}
      <PageHero
        label="Business Areas"
        title="사업분야"
        subtitle="다양한 산업 현장에 맞춤형 인력 솔루션을 제공합니다"
      />

      {/* Business Areas */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="space-y-24 md:space-y-32">
            {businesses.map((biz, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${index % 2 === 1 ? "lg:grid-flow-dense" : ""}`}
              >
                <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                  <div className="w-12 h-12 rounded-xl bg-[var(--brand-heading)] flex items-center justify-center mb-5">
                    <biz.icon className="text-white" size={22} />
                  </div>
                  <h2 className="text-3xl font-bold text-[var(--brand-heading)] tracking-[-0.01em] mb-4">{biz.title}</h2>
                  <p className="text-[var(--brand-body)] leading-relaxed mb-8 whitespace-pre-line">{biz.description}</p>
                  <div className="space-y-3">
                    {biz.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-blue)] flex-shrink-0" />
                        <span className="text-sm font-medium text-[var(--brand-heading)]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}`}>
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl shadow-black/[0.08]">
                    <img src={biz.image} alt={biz.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0F172A]/20 to-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Categories */}
      <section className="py-24 md:py-32" style={{ backgroundColor: "var(--brand-section-alt)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Job Categories</p>
          <h2 className="text-3xl font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-4">직무 분야</h2>
          <p className="text-[var(--brand-body-light)] mb-12">다양한 분야의 전문 인력을 공급합니다</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {jobCategories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md hover:shadow-black/[0.03] transition-all duration-300"
              >
                <span className="text-xs text-[var(--brand-body-light)] font-medium">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-bold text-[var(--brand-heading)] mt-2 mb-1">{cat.name}</h3>
                <p className="text-sm text-[var(--brand-body-light)]">{cat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaSection
        title="귀사에 맞는 솔루션을 제안해 드립니다"
        subtitle="전문 상담을 통해 최적의 인력 운영 방안을 찾아보세요."
      />
    </div>
  );
}