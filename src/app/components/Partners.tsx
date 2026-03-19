import { motion } from "motion/react";
import { Building2, Factory, Cpu, Truck, ShieldCheck, Pill, Sparkles, Package } from "lucide-react";

/**
 * 협력사(거래처) 리스트 섹션
 * – 로고 대신 기업명 + 산업 아이콘 기반의 에디토리얼 레이아웃
 * – 마르키(무한 스크롤) + 정적 그리드 조합
 */

const partners = [
  { name: "삼성전자", sector: "반도체/전자", icon: Cpu },
  { name: "SK하이닉스", sector: "반도체", icon: Cpu },
  { name: "현대자동차", sector: "자동차부품", icon: Factory },
  { name: "LG전자", sector: "전자부품", icon: Cpu },
  { name: "CJ대한통운", sector: "물류/유통", icon: Truck },
  { name: "한화솔루션", sector: "화학/소재", icon: Package },
  { name: "셀트리온", sector: "바이오/의료", icon: Pill },
  { name: "아모레퍼시픽", sector: "미용/화장품", icon: Sparkles },
  { name: "한국타이어", sector: "자동차부품", icon: Factory },
  { name: "롯데케미칼", sector: "화학/소재", icon: Package },
  { name: "삼성SDI", sector: "2차전지", icon: Cpu },
  { name: "쿠팡 풀필먼트", sector: "물류/유통", icon: Truck },
  { name: "포스코", sector: "철강/소재", icon: Factory },
  { name: "S-Oil", sector: "에너지", icon: ShieldCheck },
  { name: "KCC", sector: "건자재/화학", icon: Building2 },
  { name: "오리온", sector: "식품/제조", icon: Package },
];

/* ─── Marquee Row (무한 스크롤) ─── */
function MarqueeRow({ items, direction = "left", speed = 35 }: { items: typeof partners; direction?: "left" | "right"; speed?: number }) {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      {/* Edge fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[var(--brand-section-alt)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[var(--brand-section-alt)] to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-4"
        animate={{ x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((partner, i) => (
          <div
            key={`${partner.name}-${i}`}
            className="flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-xl bg-white border border-gray-100/80 hover:border-gray-200 hover:shadow-sm transition-all duration-300 select-none"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100/80 flex items-center justify-center flex-shrink-0">
              <partner.icon size={16} className="text-slate-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--brand-heading)] whitespace-nowrap">{partner.name}</span>
              <span className="block text-[10px] text-[var(--brand-body-light)] whitespace-nowrap">{partner.sector}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function PartnersSection() {
  const row1 = partners.slice(0, 8);
  const row2 = partners.slice(8, 16);

  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "var(--brand-section-alt)" }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-blue)] mb-3">
              Partners
            </p>
            <h2 className="text-3xl md:text-[2.5rem] font-bold text-[var(--brand-heading)] leading-tight tracking-[-0.02em]">
              신뢰할 수 있는 파트너사
            </h2>
          </div>
          <p className="text-sm text-[var(--brand-body-light)] max-w-xs leading-relaxed">
            국내 주요 기업들과 함께하며 지속적인 협력 관계를 유지하고 있습니다.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "50+", label: "협력 기업" },
            { value: "8개", label: "산업 분야" },
            { value: "95%", label: "재계약률" },
            { value: "6년+", label: "평균 거래 기간" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-xl border border-gray-100 px-5 py-4 text-center"
            >
              <div className="text-xl md:text-2xl font-bold text-[var(--brand-heading)] tracking-tight">{stat.value}</div>
              <div className="text-xs text-[var(--brand-body-light)] mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Marquee rows */}
      <div className="space-y-4">
        <MarqueeRow items={row1} direction="left" speed={40} />
        <MarqueeRow items={row2} direction="right" speed={45} />
      </div>

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 mt-8">
        <p className="text-[11px] text-[#8b95a5]/60 text-center">
          * 상기 기업명은 주요 거래처 일부이며, 실제 협력사 목록은 상담을 통해 안내해 드립니다.
        </p>
      </div>
    </section>
  );
}