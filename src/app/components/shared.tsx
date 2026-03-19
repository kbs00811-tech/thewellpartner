import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

/* ─── Grain Texture Overlay ─── */
const GRAIN_SVG = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function GrainOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity,
        backgroundImage: GRAIN_SVG,
        backgroundRepeat: "repeat",
        backgroundSize: "128px",
      }}
    />
  );
}

/* ─── Page Hero (sub-pages) ─── */
interface PageHeroProps {
  label: string;
  title: string;
  subtitle: string;
}

export function PageHero({ label, title, subtitle }: PageHeroProps) {
  return (
    <section
      className="relative pt-36 pb-20 overflow-hidden"
      style={{ background: "linear-gradient(165deg, var(--brand-hero-from), var(--brand-hero-to))" }}
    >
      <GrainOverlay />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold tracking-wider uppercase text-[var(--brand-cta)] mb-4">
            {label}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-[-0.02em] mb-4">
            {title}
          </h1>
          <p className="text-lg text-white/50 max-w-xl">{subtitle}</p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA Section (bottom of pages) ─── */
interface CtaSectionProps {
  title: string;
  subtitle: string;
  buttonText?: string;
  buttonTo?: string;
}

export function CtaSection({
  title,
  subtitle,
  buttonText = "상담 신청하기",
  buttonTo = "/contact",
}: CtaSectionProps) {
  return (
    <section
      className="py-24 md:py-28 relative overflow-hidden"
      style={{ background: "linear-gradient(165deg, var(--brand-hero-from), var(--brand-hero-to))" }}
    >
      <GrainOverlay opacity={0.04} />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <h2 className="text-3xl md:text-[2.25rem] font-bold text-white leading-tight tracking-[-0.02em] mb-5">
          {title}
        </h2>
        <p className="text-lg text-white/50 mb-10">{subtitle}</p>
        <Link
          to={buttonTo}
          className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-[var(--brand-heading)] font-semibold rounded-full transition-all hover:bg-white/90"
        >
          {buttonText}
          <ArrowRight
            size={17}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}