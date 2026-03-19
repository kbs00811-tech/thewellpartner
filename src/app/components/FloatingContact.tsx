import { useState } from "react";
import { Link } from "react-router";
import { Phone, X, MessageCircle, Briefcase, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCompanyInfo, display } from "./CompanyInfoContext";

export function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);
  const { info } = useCompanyInfo();

  const phone = display(info.phone, "031-XXX-XXXX");
  const companyName = display(info.company_name, "더웰파트너");

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-xl shadow-black/[0.08] border border-gray-100 w-[240px] overflow-hidden"
          >
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, var(--brand-hero-from), var(--brand-hero-to))" }}>
              <div className="text-white text-sm font-semibold">빠른 상담</div>
              <div className="text-[11px] text-white/40 mt-0.5">{companyName}에 문의하세요</div>
            </div>
            <div className="p-2.5 space-y-0.5">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Phone size={16} className="text-[var(--brand-blue)]" />
                <div>
                  <div className="text-sm font-semibold text-[var(--brand-heading)]">전화 상담</div>
                  <div className="text-[11px] text-[#8b95a5]">{phone}</div>
                </div>
              </a>
              <Link
                to="/contact"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Briefcase size={16} className="text-[var(--brand-blue)]" />
                <div>
                  <div className="text-sm font-semibold text-[var(--brand-heading)]">기업 상담</div>
                  <div className="text-[11px] text-[#8b95a5]">맞춤 솔루션 제안</div>
                </div>
              </Link>
              <Link
                to="/recruit"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users size={16} className="text-[var(--brand-blue)]" />
                <div>
                  <div className="text-sm font-semibold text-[var(--brand-heading)]">채용 문의</div>
                  <div className="text-[11px] text-[#8b95a5]">취업 지원하기</div>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "상담 메뉴 닫기" : "빠른 상담"}
        aria-expanded={isOpen}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white transition-all duration-200 ${
          isOpen ? "bg-[var(--brand-heading)] shadow-black/20" : "bg-[var(--brand-cta)] shadow-blue-500/30 hover:shadow-blue-500/40"
        }`}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
