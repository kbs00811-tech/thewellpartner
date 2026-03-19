import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { GrainOverlay } from "../components/shared";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden" style={{ background: "linear-gradient(165deg, var(--brand-hero-from), var(--brand-hero-to))" }}>
      <GrainOverlay opacity={0.04} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-center max-w-lg"
      >
        <div className="text-[8rem] md:text-[10rem] font-bold leading-none mb-2 text-white/[0.06]">
          404
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-[-0.02em]">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-white/40 mb-10">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[var(--brand-heading)] font-semibold rounded-full transition-all hover:bg-white/90"
          >
            <Home size={16} />
            홈으로 가기
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/15 text-white font-medium rounded-full transition-all hover:bg-white/5 hover:border-white/25"
          >
            <ArrowLeft size={16} />
            이전 페이지
          </button>
        </div>
      </motion.div>
    </div>
  );
}