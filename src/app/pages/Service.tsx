import { useState, useEffect } from "react";
import {
  UserCheck, GraduationCap, Headphones, DollarSign, Clock, FileCheck,
  Phone, Users, BarChart3, Settings,
} from "lucide-react";
import { motion } from "motion/react";
import { ManagementAnimation } from "../components/BusinessAnimations";
import { PageHero, CtaSection } from "../components/shared";
import { useSEO } from "../lib/useSEO";
import * as api from "../lib/api";

export default function Service() {
  useSEO({ title: "서비스", description: "더웰파트너의 인력 매칭, 교육훈련, 운영관리, 급여/근태 관리 등 통합 서비스를 확인하세요." });
  const [siteContent, setSiteContent] = useState<any>(null);

  useEffect(() => {
    api.publicApi.getSiteContent("service").then(setSiteContent).catch(() => {});
  }, []);

  // 어드민에서 설정한 콘텐츠가 있으면 사용, 없으면 기본값
  const getDesc = (key: string, fallback: string) => siteContent?.[key] || fallback;

  const services = [
    { icon: UserCheck, title: "인재파견 서비스", description: getDesc("staffing_desc", "고객사의 요구에 맞는 최적의 인재를 선발하여 공급합니다."), details: ["요구사항 상세 분석", "직무 맞춤형 인재 선발", "사전 면접 및 검증", "신속한 인력 배치"] },
    { icon: GraduationCap, title: "인재육성 시스템", description: getDesc("training_desc", "자체 교육 프로그램을 통해 우수한 인재를 양성합니다."), details: ["직무별 교육 프로그램", "안전 교육 실시", "실무 교육 및 훈련", "지속적인 역량 개발"] },
    { icon: Headphones, title: "사후관리 시스템", description: getDesc("aftercare_desc", "투입 후에도 지속적인 관리와 지원을 제공합니다."), details: ["정기 모니터링", "근무 만족도 조사", "문제 발생 시 신속 대응", "대체 인력 즉시 지원"] },
    { icon: DollarSign, title: "급여관리 시스템", description: getDesc("payroll_desc", "정확하고 투명한 급여 관리 시스템을 제공합니다."), details: ["급여 자동 계산", "세금 및 공제 처리", "급여명세서 발급", "연말정산 대행"] },
    { icon: Clock, title: "근태관리 시스템", description: getDesc("attendance_desc", "체계적인 근태 관리로 효율적인 인력 운영을 지원합니다."), details: ["출퇴근 기록 관리", "근무시간 자동 집계", "휴가 및 결근 관리", "실시간 현황 확인"] },
    { icon: FileCheck, title: "4대보험 관리", description: getDesc("insurance_desc", "복잡한 4대보험 업무를 대행하여 편리함을 제공합니다."), details: ["4대보험 가입 및 상실 신고", "보험료 계산 및 납부", "산재 처리 지원", "정기 신고 대행"] },
  ];

  const processSteps = [
    { step: "01", title: "상담접수", description: "고객사의 요구사항과 현황을 상세히 파악합니다.", icon: Phone },
    { step: "02", title: "요구사항 분석", description: "필요한 인력의 규모, 직무, 조건을 분석합니다.", icon: BarChart3 },
    { step: "03", title: "인력 선발", description: "직무에 적합한 인재를 선발하고 검증합니다.", icon: Users },
    { step: "04", title: "교육/배치", description: "사전 교육을 실시하고 현장에 배치합니다.", icon: GraduationCap },
    { step: "05", title: "운영관리", description: "급여, 근태, 보험 등을 통합 관리합니다.", icon: Settings },
    { step: "06", title: "사후관리", description: "지속적인 모니터링과 품질 개선을 합니다.", icon: Headphones },
  ];

  return (
    <div className="w-full">
      <PageHero
        label="Service System"
        title="서비스 시스템"
        subtitle="체계적인 시스템으로 최고의 인력 운영 서비스를 제공합니다"
      />

      {/* Services Grid */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Integrated System</p>
          <h2 className="text-3xl font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-4">통합 관리 시스템</h2>
          <p className="text-[var(--brand-body-light)] mb-12">인재 선발부터 운영 관리까지 원스톱 서비스</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-heading)] flex items-center justify-center mb-5">
                  <service.icon className="text-white" size={22} />
                </div>
                <h3 className="text-lg font-bold text-[var(--brand-heading)] mb-2">{service.title}</h3>
                <p className="text-sm text-[var(--brand-body-light)] leading-relaxed mb-5">{service.description}</p>
                <ul className="space-y-2">
                  {service.details.map((d, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-[var(--brand-body)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-blue)] flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 md:py-32" style={{ backgroundColor: "var(--brand-section-alt)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Process</p>
          <h2 className="text-3xl font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-4">서비스 프로세스</h2>
          <p className="text-[var(--brand-body-light)] mb-12">단계별 체계적 프로세스를 통해 최상의 서비스를 제공합니다</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {processSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="bg-white rounded-2xl p-7 border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[var(--brand-heading)] flex items-center justify-center">
                    <step.icon className="text-white" size={20} />
                  </div>
                  <span className="text-sm font-bold text-[var(--brand-blue)]">STEP {step.step}</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--brand-heading)] mb-1.5">{step.title}</h3>
                <p className="text-sm text-[var(--brand-body-light)]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">Differentiation</p>
              <h2 className="text-3xl font-bold text-[var(--brand-heading)] tracking-[-0.02em] mb-6">차별화된 관리 시스템</h2>
              <p className="text-[var(--brand-body)] leading-relaxed mb-10">
                더웰파트너는 단순히 인력을 공급하는 것을 넘어,
                체계적인 관리 시스템을 통해 기업의 인력 운영 부담을 최소화합니다.
              </p>
              <div className="space-y-5">
                {[
                  { title: "실시간 관리 시스템", desc: "웹 기반 시스템으로 언제 어디서나 근무 현황을 확인할 수 있습니다." },
                  { title: "자동화된 급여 처리", desc: "근태 데이터를 기반으로 급여를 자동 계산하고 지급합니다." },
                  { title: "법률 준수", desc: "노동 관련 법률을 철저히 준수하여 법적 리스크를 예방합니다." },
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
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <ManagementAnimation />
            </motion.div>
          </div>
        </div>
      </section>

      <CtaSection
        title="서비스 시스템을 직접 경험해보세요"
        subtitle="전문 상담을 통해 귀사에 맞는 최적의 시스템을 안내해 드립니다."
      />
    </div>
  );
}