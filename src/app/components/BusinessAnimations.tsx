import { motion } from "motion/react";
import {
  Factory, Users, GraduationCap, Building2, Settings, Monitor,
  Package, Truck, UserCheck, BarChart3, Cog, Wrench, BookOpen,
  Handshake, TrendingUp, Shield,
} from "lucide-react";

/* ─── Shared ─── */
const NAVY = "#0f172a";
const BLUE = "#3b82f6";
const LIGHT = "#eff6ff";
const BG = "#f1f5f9";

function FloatingIcon({
  icon: Icon, x, y, delay, size = 20, color = NAVY, bgColor = "white",
}: {
  icon: any; x: string; y: string; delay: number; size?: number; color?: string; bgColor?: string;
}) {
  return (
    <motion.div
      className="absolute rounded-xl shadow-lg shadow-black/[0.06] flex items-center justify-center"
      style={{ left: x, top: y, width: size * 2.4, height: size * 2.4, backgroundColor: bgColor }}
      initial={{ opacity: 0, scale: 0, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 200 }}
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 2.5 + delay, ease: "easeInOut" }}
      >
        <Icon size={size} color={color} strokeWidth={1.8} />
      </motion.div>
    </motion.div>
  );
}

function PulseRing({ x, y, delay, color = BLUE }: { x: string; y: string; delay: number; color?: string }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ left: x, top: y, width: 60, height: 60, border: `2px solid ${color}` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.3, 0, 0.3], scale: [0.8, 1.4, 0.8] }}
      transition={{ repeat: Infinity, duration: 3, delay, ease: "easeInOut" }}
    />
  );
}

function AnimationWrapper({
  children,
  className = "",
  bgColor = BG,
}: {
  children: React.ReactNode;
  className?: string;
  bgColor?: string;
}) {
  return (
    <div
      className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke={NAVY} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {children}
    </div>
  );
}

/* ─── 1. 생산/물류 도급 ─── */
export function ProductionAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Conveyor belt */}
      <motion.div
        className="absolute bottom-[30%] left-[8%] right-[8%] h-[3px] rounded-full"
        style={{ backgroundColor: NAVY }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      {/* Moving boxes on belt */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-lg"
          style={{
            bottom: "31%",
            width: 36,
            height: 28,
            backgroundColor: i === 1 ? BLUE : LIGHT,
            border: `1.5px solid ${i === 1 ? BLUE : "#c8d6e5"}`,
          }}
          initial={{ left: "-10%", opacity: 0 }}
          animate={{ left: ["10%", "85%"], opacity: [0, 1, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: 4,
            delay: i * 1.3,
            ease: "linear",
          }}
        >
          <Package size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" color={i === 1 ? "white" : "#8b95a5"} />
        </motion.div>
      ))}
      {/* Robot arm */}
      <motion.div
        className="absolute top-[18%] left-[55%]"
        animate={{ rotate: [0, -15, 0, 15, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ transformOrigin: "top center" }}
      >
        <div className="w-[3px] h-16 rounded-full mx-auto" style={{ backgroundColor: NAVY }} />
        <div className="w-6 h-6 rounded-lg -ml-[10px]" style={{ backgroundColor: BLUE }} />
      </motion.div>
      <FloatingIcon icon={Factory} x="10%" y="10%" delay={0.2} color="white" bgColor={NAVY} />
      <FloatingIcon icon={Cog} x="78%" y="8%" delay={0.4} />
      <FloatingIcon icon={Truck} x="75%" y="60%" delay={0.6} color={BLUE} />
      <PulseRing x="40%" y="55%" delay={0} />
      {/* Stats card */}
      <motion.div
        className="absolute bottom-[10%] left-[10%] bg-white rounded-xl px-4 py-3 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="text-[10px] text-[#8b95a5] mb-0.5">생산 효율</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold" style={{ color: NAVY }}>98.2</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: BLUE }}>%</span>
        </div>
      </motion.div>
    </AnimationWrapper>
  );
}

/* ─── 2. 인재파견 (사무직) ─── */
export function StaffingAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Central desk illustration */}
      <motion.div
        className="absolute top-[28%] left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Monitor */}
        <div className="relative">
          <div className="w-28 h-20 rounded-lg border-2 mx-auto flex items-center justify-center" style={{ borderColor: NAVY, backgroundColor: "white" }}>
            <motion.div className="space-y-1.5 px-3 w-full">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 rounded-full"
                  style={{ backgroundColor: i === 0 ? BLUE : LIGHT, width: i === 2 ? "60%" : "100%" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8 + i * 0.15 }}
                />
              ))}
            </motion.div>
          </div>
          <div className="w-4 h-4 mx-auto" style={{ backgroundColor: NAVY }} />
          <div className="w-16 h-1.5 rounded-full mx-auto" style={{ backgroundColor: NAVY }} />
        </div>
      </motion.div>
      {/* Connecting people */}
      {[
        { x: "12%", y: "20%", delay: 0.4 },
        { x: "76%", y: "18%", delay: 0.5 },
        { x: "8%", y: "58%", delay: 0.6 },
        { x: "80%", y: "55%", delay: 0.7 },
      ].map((p, i) => (
        <motion.div key={i}>
          <FloatingIcon icon={UserCheck} x={p.x} y={p.y} delay={p.delay} size={16} color={i % 2 === 0 ? BLUE : NAVY} />
          <motion.div
            className="absolute w-[1px]"
            style={{
              left: `calc(${p.x} + 20px)`,
              top: `calc(${p.y} + 20px)`,
              height: 30,
              backgroundColor: BLUE,
              opacity: 0.2,
              rotate: i < 2 ? "30deg" : "-30deg",
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: p.delay + 0.3 }}
          />
        </motion.div>
      ))}
      <PulseRing x="38%" y="35%" delay={0.5} />
      <PulseRing x="52%" y="55%" delay={1} />
      {/* Matching card */}
      <motion.div
        className="absolute bottom-[10%] right-[10%] bg-white rounded-xl px-4 py-3 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="text-[10px] text-[#8b95a5] mb-0.5">인재 매칭률</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold" style={{ color: NAVY }}>96.5</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: BLUE }}>%</span>
        </div>
      </motion.div>
      <FloatingIcon icon={Monitor} x="70%" y="72%" delay={0.9} size={16} />
    </AnimationWrapper>
  );
}

/* ─── 3. 컨설팅/교육훈련 ─── */
export function TrainingAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Whiteboard */}
      <motion.div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[55%]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="bg-white rounded-xl border-2 p-4 shadow-sm" style={{ borderColor: NAVY }}>
          {/* Chart bars animation */}
          <div className="flex items-end gap-2 h-14 mb-2">
            {[40, 65, 50, 80, 70, 90].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ backgroundColor: i === 5 ? BLUE : i === 3 ? BLUE + "80" : LIGHT }}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.5, type: "spring" }}
              />
            ))}
          </div>
          <motion.div
            className="h-[1.5px] rounded-full"
            style={{ backgroundColor: "#e2e8f0" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5 }}
          />
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1 rounded-full"
                style={{ backgroundColor: LIGHT, width: i === 2 ? 16 : 24 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.1 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
      {/* Attendee dots */}
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 flex gap-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.12 }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: i === 2 ? BLUE : NAVY }}>
              <Users size={12} color="white" />
            </div>
            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: "#d1d5db" }} />
          </motion.div>
        ))}
      </div>
      <FloatingIcon icon={GraduationCap} x="8%" y="12%" delay={0.3} color="white" bgColor={NAVY} />
      <FloatingIcon icon={BookOpen} x="80%" y="14%" delay={0.5} color={BLUE} />
      <FloatingIcon icon={TrendingUp} x="82%" y="62%" delay={0.7} size={16} />
      <PulseRing x="15%" y="60%" delay={0.8} />
      {/* Learning progress */}
      <motion.div
        className="absolute bottom-[8%] left-[8%] bg-white rounded-xl px-4 py-3 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="text-[10px] text-[#8b95a5] mb-1">교육 이수율</div>
        <div className="w-24 h-1.5 rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: BLUE }}
            initial={{ width: 0 }}
            animate={{ width: "92%" }}
            transition={{ delay: 1.5, duration: 0.8 }}
          />
        </div>
      </motion.div>
    </AnimationWrapper>
  );
}

/* ─── 4. 빌딩 종합관리 ─── */
export function BuildingAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Building */}
      <motion.div
        className="absolute bottom-[15%] left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="relative">
          <div className="w-32 h-44 rounded-t-xl mx-auto" style={{ backgroundColor: NAVY }}>
            {/* Windows grid */}
            <div className="grid grid-cols-3 gap-1.5 p-3 pt-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-3 rounded-sm"
                  style={{ backgroundColor: i === 4 || i === 7 || i === 10 ? BLUE : `${BLUE}30` }}
                  animate={{
                    backgroundColor: [
                      i % 3 === 0 ? BLUE : `${BLUE}30`,
                      i % 3 === 1 ? BLUE : `${BLUE}30`,
                      i % 3 === 2 ? BLUE : `${BLUE}30`,
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 3, delay: i * 0.2 }}
                />
              ))}
            </div>
            {/* Entrance */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-10 rounded-t-lg" style={{ backgroundColor: LIGHT }} />
          </div>
          {/* Base */}
          <div className="w-40 h-2 rounded-b-lg mx-auto" style={{ backgroundColor: NAVY }} />
        </div>
      </motion.div>
      {/* System indicators */}
      <FloatingIcon icon={Settings} x="10%" y="15%" delay={0.4} />
      <FloatingIcon icon={Wrench} x="78%" y="12%" delay={0.5} color={BLUE} />
      <FloatingIcon icon={Shield} x="80%" y="58%" delay={0.7} size={16} />
      <PulseRing x="18%" y="55%" delay={0.5} />
      {/* Gauges */}
      <motion.div
        className="absolute top-[12%] left-[38%] bg-white rounded-xl px-3 py-2.5 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
      >
        <div className="text-[9px] text-[#8b95a5]">설비 가동률</div>
        <div className="flex gap-0.5 mt-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-2 rounded-sm"
              style={{ backgroundColor: i < 4 ? BLUE : "#e2e8f0", height: 8 + i * 3 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 1.1 + i * 0.1 }}
            />
          ))}
        </div>
      </motion.div>
    </AnimationWrapper>
  );
}

/* ─── 5. 관리 시스템 (Service) ─── */
export function ManagementAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Dashboard mockup */}
      <motion.div
        className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[72%] bg-white rounded-xl border shadow-lg shadow-black/[0.04] overflow-hidden"
        style={{ borderColor: "#e2e8f0" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "#e2e8f0" }}>
          <div className="w-2 h-2 rounded-full bg-red-300" />
          <div className="w-2 h-2 rounded-full bg-yellow-300" />
          <div className="w-2 h-2 rounded-full bg-green-300" />
          <div className="ml-2 h-1.5 w-16 rounded-full bg-gray-100" />
        </div>
        <div className="p-3">
          {/* Mini chart */}
          <div className="flex items-end gap-1 h-10 mb-2">
            {[30, 45, 35, 60, 50, 75, 65, 85, 70, 90].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ backgroundColor: i >= 8 ? BLUE : LIGHT }}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.6 + i * 0.06, duration: 0.4 }}
              />
            ))}
          </div>
          {/* Data rows */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? BLUE : LIGHT }} />
              <motion.div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: "#f0f4f8", width: i === 2 ? "40%" : "70%" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
              />
            </div>
          ))}
        </div>
      </motion.div>
      <FloatingIcon icon={BarChart3} x="8%" y="15%" delay={0.4} color="white" bgColor={NAVY} />
      <FloatingIcon icon={Settings} x="80%" y="20%" delay={0.6} color={BLUE} />
      <PulseRing x="70%" y="60%" delay={0.3} />
      {/* Metric */}
      <motion.div
        className="absolute bottom-[10%] left-[10%] bg-white rounded-xl px-4 py-3 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="text-[10px] text-[#8b95a5] mb-0.5">시스템 가동률</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold" style={{ color: NAVY }}>99.9</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: BLUE }}>%</span>
        </div>
      </motion.div>
      <FloatingIcon icon={Monitor} x="75%" y="68%" delay={0.8} size={16} />
    </AnimationWrapper>
  );
}

/* ─── 6. 파트너십 (About CEO) ─── */
export function PartnershipAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Handshake center */}
      <motion.div
        className="absolute top-[30%] left-1/2 -translate-x-1/2 w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: NAVY }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      >
        <Handshake size={32} color="white" strokeWidth={1.5} />
      </motion.div>
      {/* Connecting lines */}
      {[
        { x1: "25%", y1: "20%", rotate: "25deg" },
        { x1: "65%", y1: "20%", rotate: "-25deg" },
        { x1: "20%", y1: "60%", rotate: "-20deg" },
        { x1: "70%", y1: "60%", rotate: "20deg" },
      ].map((line, i) => (
        <motion.div
          key={i}
          className="absolute w-[1px] h-10"
          style={{
            left: line.x1,
            top: line.y1,
            backgroundColor: BLUE,
            opacity: 0.15,
            rotate: line.rotate,
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.6 + i * 0.1 }}
        />
      ))}
      <FloatingIcon icon={Handshake} x="10%" y="10%" delay={0.4} color="white" bgColor={BLUE} size={18} />
      <FloatingIcon icon={Users} x="76%" y="12%" delay={0.5} />
      <FloatingIcon icon={TrendingUp} x="78%" y="60%" delay={0.7} color={BLUE} size={16} />
      <FloatingIcon icon={Shield} x="8%" y="58%" delay={0.6} size={16} />
      <PulseRing x="35%" y="28%" delay={0.3} />
      <PulseRing x="50%" y="50%" delay={0.8} />
      {/* Trust card */}
      <motion.div
        className="absolute bottom-[10%] right-[10%] bg-white rounded-xl px-4 py-3 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="text-[10px] text-[#8b95a5] mb-0.5">고객 재계약률</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold" style={{ color: NAVY }}>97.3</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: BLUE }}>%</span>
        </div>
      </motion.div>
    </AnimationWrapper>
  );
}

/* ─── 7. 홈 히어로 배경 (Full-bleed, brighter navy + industry animations) ─── */
export function HeroAnimation({ className = "" }: { className?: string }) {
  const HERO_FROM = "#0c1631";
  const HERO_TO = "#162b52";
  const GLOW = "#3b82f6";

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ background: `linear-gradient(165deg, ${HERO_FROM}, ${HERO_TO})` }}>
      {/* Subtle radial glow spots */}
      <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: `radial-gradient(circle, ${GLOW}, transparent 70%)` }} />
      <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: `radial-gradient(circle, ${GLOW}, transparent 70%)` }} />

      {/* Grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* ── CONVEYOR BELT (Production/Manufacturing) — right side ── */}
      <div className="absolute right-[5%] top-[18%] w-[45%] h-[35%] hidden md:block">
        {/* Belt track */}
        <motion.div
          className="absolute bottom-[30%] left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${GLOW}40, ${GLOW}60, ${GLOW}40, transparent)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        />
        {/* Belt roller dots */}
        {[10, 30, 50, 70, 90].map((pct, i) => (
          <motion.div
            key={`roller-${i}`}
            className="absolute rounded-full"
            style={{ left: `${pct}%`, bottom: "28%", width: 6, height: 6, backgroundColor: `${GLOW}50` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
          />
        ))}
        {/* Moving packages */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`pkg-${i}`}
            className="absolute rounded-lg flex items-center justify-center"
            style={{
              bottom: "32%",
              width: 32,
              height: 26,
              backgroundColor: i === 1 ? `${GLOW}` : `${GLOW}20`,
              border: `1.5px solid ${i === 1 ? GLOW : `${GLOW}40`}`,
            }}
            initial={{ left: "-5%", opacity: 0 }}
            animate={{ left: ["-5%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, delay: i * 1.6, ease: "linear" }}
          >
            <Package size={12} color={i === 1 ? "white" : `${GLOW}90`} />
          </motion.div>
        ))}
        {/* Robot arm */}
        <motion.div
          className="absolute top-[5%] right-[25%]"
          animate={{ rotate: [0, -12, 0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
          style={{ transformOrigin: "top center" }}
        >
          <div className="w-[2px] h-14 rounded-full mx-auto" style={{ background: `linear-gradient(to bottom, ${GLOW}80, ${GLOW}30)` }} />
          <div className="w-5 h-5 rounded-md -ml-[9px]" style={{ backgroundColor: GLOW, boxShadow: `0 0 12px ${GLOW}60` }} />
        </motion.div>
      </div>

      {/* ── SEMICONDUCTOR CHIP (반도체) — right top ── */}
      <motion.div
        className="absolute right-[8%] top-[12%] hidden lg:flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 1, duration: 0.8, type: "spring" }}
      >
        <div className="relative w-20 h-20">
          {/* Chip body */}
          <div className="absolute inset-2 rounded-lg border-2 flex items-center justify-center"
            style={{ borderColor: `${GLOW}60`, backgroundColor: `${GLOW}10` }}>
            <motion.div
              className="w-6 h-6 rounded-sm"
              style={{ backgroundColor: `${GLOW}40`, boxShadow: `0 0 20px ${GLOW}30` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
          {/* Chip pins */}
          {[0, 1, 2, 3].map((side) => (
            <div key={`side-${side}`}>
              {[0, 1, 2].map((pin) => {
                const styles: React.CSSProperties = {};
                const sz = 6;
                if (side === 0) { styles.top = 8 + pin * 18; styles.left = -sz; styles.width = sz; styles.height = 2; }
                if (side === 1) { styles.top = 8 + pin * 18; styles.right = -sz; styles.width = sz; styles.height = 2; }
                if (side === 2) { styles.left = 12 + pin * 18; styles.top = -sz; styles.width = 2; styles.height = sz; }
                if (side === 3) { styles.left = 12 + pin * 18; styles.bottom = -sz; styles.width = 2; styles.height = sz; }
                return (
                  <motion.div
                    key={`pin-${side}-${pin}`}
                    className="absolute rounded-full"
                    style={{ ...styles, backgroundColor: `${GLOW}50` }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: (side * 3 + pin) * 0.15 }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── LOGISTICS FLOW (물류) — bottom area ── */}
      <div className="absolute bottom-[15%] left-[55%] right-[3%] h-[60px] hidden md:block">
        {/* Route path */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
          <motion.path
            d="M 0 30 Q 100 10, 200 30 T 400 30"
            fill="none"
            stroke={`${GLOW}25`}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.2, duration: 1.5 }}
          />
        </svg>
        {/* Moving truck */}
        <motion.div
          className="absolute flex items-center gap-1"
          style={{ top: "20%" }}
          initial={{ left: "-10%" }}
          animate={{ left: ["-10%", "95%"] }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        >
          <div className="w-8 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${GLOW}30`, border: `1px solid ${GLOW}50` }}>
            <Truck size={13} color={GLOW} />
          </div>
        </motion.div>
      </div>

      {/* ── FLOATING INDUSTRY ICONS ── */}
      {[
        { icon: Factory, x: "60%", y: "8%", d: 0, accent: true, label: "제조" },
        { icon: Users, x: "78%", y: "45%", d: 0.3, accent: false, label: "인력" },
        { icon: Settings, x: "88%", y: "25%", d: 0.7, accent: false, label: "관리" },
        { icon: BarChart3, x: "65%", y: "55%", d: 0.4, accent: false, label: "분석" },
        { icon: Cog, x: "52%", y: "22%", d: 0.5, accent: false, label: "설비" },
      ].map(({ icon: Icon, x, y, d, accent, label }, i) => (
        <motion.div
          key={`icon-${i}`}
          className="absolute hidden md:flex flex-col items-center gap-1.5"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + d, type: "spring", stiffness: 200 }}
        >
          <motion.div
            className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor: accent ? GLOW : "rgba(255,255,255,0.06)",
              border: `1px solid ${accent ? GLOW : "rgba(255,255,255,0.1)"}`,
              boxShadow: accent ? `0 0 20px ${GLOW}40` : "none",
            }}
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3.5 + d, ease: "easeInOut" }}
          >
            <Icon size={18} color="white" strokeWidth={1.5} />
          </motion.div>
          <span className="text-[9px] font-medium tracking-wider text-white/30 uppercase">{label}</span>
        </motion.div>
      ))}

      {/* ── DATA FLOW PARTICLES ── */}
      {Array.from({ length: 15 }).map((_, i) => {
        const startX = 50 + Math.random() * 50;
        const startY = 10 + Math.random() * 70;
        return (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full hidden md:block"
            style={{
              left: `${startX}%`,
              top: `${startY}%`,
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              backgroundColor: i % 4 === 0 ? GLOW : "rgba(255,255,255,0.15)",
            }}
            animate={{
              opacity: [0, 0.6, 0],
              y: [0, -20 - Math.random() * 30, -50],
              x: [0, (Math.random() - 0.5) * 20],
            }}
            transition={{
              repeat: Infinity,
              duration: 3 + Math.random() * 3,
              delay: i * 0.4,
              ease: "easeOut",
            }}
          />
        );
      })}

      {/* ── CONNECTION LINES (network) ── */}
      <svg className="absolute inset-0 w-full h-full hidden md:block">
        {[
          { x1: "62%", y1: "12%", x2: "78%", y2: "48%" },
          { x1: "78%", y1: "48%", x2: "90%", y2: "28%" },
          { x1: "54%", y1: "25%", x2: "67%", y2: "58%" },
          { x1: "67%", y1: "58%", x2: "90%", y2: "28%" },
          { x1: "62%", y1: "12%", x2: "54%", y2: "25%" },
        ].map((line, i) => (
          <motion.line
            key={`line-${i}`}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke={GLOW}
            strokeWidth="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.04, 0.12, 0.04] }}
            transition={{ repeat: Infinity, duration: 4, delay: i * 0.5 }}
          />
        ))}
      </svg>

      {/* ── LIVE METRICS (bottom-right cards) ── */}
      <motion.div
        className="absolute right-[6%] bottom-[28%] bg-white/[0.06] backdrop-blur-md rounded-xl px-4 py-3 border border-white/[0.08] hidden lg:block"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <div className="text-[9px] text-white/40 mb-1 font-medium tracking-wide">생산 효율</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold text-white">98.2</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: GLOW }}>%</span>
        </div>
        <div className="flex gap-0.5 mt-1.5">
          {[40, 55, 45, 70, 65, 80, 75, 90].map((h, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-t-sm"
              style={{ backgroundColor: i >= 6 ? GLOW : `${GLOW}40`, height: h * 0.2 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 2 + i * 0.05 }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="absolute right-[22%] bottom-[20%] bg-white/[0.06] backdrop-blur-md rounded-xl px-4 py-3 border border-white/[0.08] hidden lg:block"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.6 }}
      >
        <div className="text-[9px] text-white/40 mb-1 font-medium tracking-wide">인력 배치율</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold text-white">96.5</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: GLOW }}>%</span>
        </div>
      </motion.div>

      {/* Gradient overlay for text readability — brighter */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${HERO_FROM} 5%, ${HERO_FROM}cc 30%, ${HERO_FROM}80 60%, ${HERO_FROM}50 100%)` }} />
    </div>
  );
}

/* ─── 8. 홈 벤토 생산도급 카드 (Compact) ─── */
export function ProductionCompactAnimation({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full h-full overflow-hidden rounded-t-xl ${className}`} style={{ backgroundColor: BG }}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="compact-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={NAVY} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#compact-grid)" />
      </svg>
      {/* Mini conveyor */}
      <motion.div
        className="absolute bottom-[35%] left-[10%] right-[10%] h-[2px] rounded-full"
        style={{ backgroundColor: NAVY }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-6 h-5 rounded"
          style={{
            bottom: "36%",
            backgroundColor: i === 1 ? BLUE : LIGHT,
            border: `1px solid ${i === 1 ? BLUE : "#c8d6e5"}`,
          }}
          initial={{ left: "5%" }}
          animate={{ left: ["10%", "82%"] }}
          transition={{ repeat: Infinity, duration: 3.5, delay: i * 1.1, ease: "linear" }}
        />
      ))}
      <FloatingIcon icon={Factory} x="8%" y="8%" delay={0.1} size={14} color="white" bgColor={NAVY} />
      <FloatingIcon icon={Cog} x="72%" y="6%" delay={0.3} size={14} />
    </div>
  );
}

/* ─── 9. 팀워크 (Home Why Us) ─── */
export function TeamAnimation({ className = "" }: { className?: string }) {
  return (
    <AnimationWrapper className={className}>
      {/* Central hub */}
      <motion.div
        className="absolute top-[32%] left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: BLUE }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
      >
        <Users size={26} color="white" strokeWidth={1.5} />
      </motion.div>
      {/* Orbiting members */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        const rx = 30;
        const ry = 26;
        const cx = 50 + rx * Math.cos(angle);
        const cy = 42 + ry * Math.sin(angle);
        return (
          <motion.div
            key={i}
            className="absolute w-9 h-9 rounded-xl bg-white shadow-md shadow-black/[0.05] flex items-center justify-center"
            style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
          >
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2 + i * 0.3, ease: "easeInOut" }}
            >
              <UserCheck size={15} color={i % 2 === 0 ? BLUE : NAVY} strokeWidth={1.8} />
            </motion.div>
          </motion.div>
        );
      })}
      <PulseRing x="40%" y="30%" delay={0.3} />
      <PulseRing x="48%" y="45%" delay={0.9} />
      {/* Metric card */}
      <motion.div
        className="absolute bottom-[8%] left-[8%] bg-white rounded-xl px-4 py-3 shadow-lg shadow-black/[0.05]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="text-[10px] text-[#8b95a5] mb-0.5">업무 자동화율</div>
        <div className="flex items-end gap-1">
          <span className="text-lg font-bold" style={{ color: NAVY }}>95</span>
          <span className="text-xs font-semibold mb-0.5" style={{ color: BLUE }}>%</span>
        </div>
      </motion.div>
    </AnimationWrapper>
  );
}