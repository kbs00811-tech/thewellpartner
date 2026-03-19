import { useState, useEffect } from "react";
import { Link } from "react-router";
import { FileText, HelpCircle, Download, ArrowRight, Loader2, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "../components/ui/accordion";
import { motion } from "motion/react";
import * as api from "../lib/api";
import { PageHero, CtaSection } from "../components/shared";
import { useSEO } from "../lib/useSEO";
import { handleError, handleWarning } from "../lib/error-handler";

/* ── 페이지네이션 훅 ── */
function usePagination<T>(items: T[], perPage = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const pagedItems = items.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [items.length]);
  return { page, setPage, totalPages, pagedItems, total: items.length };
}

function PaginationBar({ page, setPage, totalPages, total }: { page: number; setPage: (p: number) => void; totalPages: number; total: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronLeft size={16} className="text-gray-500" /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce((acc: (number | "...")[], p, idx, arr) => {
          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-1 text-xs text-gray-300">...</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p as number)}
              className={`min-w-[32px] h-8 rounded-lg text-sm font-semibold transition-all ${page === p ? "text-white" : "text-gray-500 hover:bg-gray-100"}`}
              style={page === p ? { backgroundColor: "var(--brand-blue)" } : {}}
            >
              {p}
            </button>
          )
        )}
      <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronRight size={16} className="text-gray-500" /></button>
    </div>
  );
}

/* 하드코딩 fallback 제거 — 어드민에서 자료가 등록되지 않으면 빈 상태 표시 */

export default function Customer() {
  useSEO({ title: "고객센터", description: "더웰파트너 공지사항, FAQ, 자료실을 확인하세요. 궁금하신 사항은 문의해주세요." });
  const [activeTab, setActiveTab] = useState<"notice" | "faq" | "materials">("notice");
  const [notices, setNotices] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [materialList, setMaterialList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [noticeRes, faqRes, matRes] = await Promise.all([
        api.publicApi.getNotices(),
        api.publicApi.getFaqs(),
        api.publicApi.getMaterials().catch(() => []),
      ]);
      setNotices(Array.isArray(noticeRes) ? noticeRes : []);
      setFaqs(Array.isArray(faqRes) ? faqRes : []);
      setMaterialList(Array.isArray(matRes) ? matRes : []);
    } catch (e) { handleError(e, { fallback: "데이터를 불러오는 데 실패했습니다.", silent: true }); }
    finally { setLoading(false); }
  };

  const noticePag = usePagination(notices, 8);
  const materialPag = usePagination(materialList, 8);

  const tabs = [
    { key: "notice" as const, label: "공지사항", icon: FileText, count: notices.length },
    { key: "faq" as const, label: "FAQ", icon: HelpCircle, count: faqs.length },
    { key: "materials" as const, label: "자료실", icon: Download, count: materialList.length },
  ];

  const faqCategories = [...new Set(faqs.map((f) => f.category).filter(Boolean))];

  const handleDownloadMaterial = (material: any) => {
    if (material.file_url) {
      window.open(material.file_url, "_blank");
    } else {
      handleWarning("다운로드 파일이 아직 등록되지 않았습니다.");
    }
  };

  return (
    <div className="w-full">
      {/* Hero */}
      <PageHero
        label="Support"
        title="고객센터"
        subtitle="공지사항, 자주 묻는 질문, 자료실을 확인하세요"
      />

      {/* Tabs */}
      <section className="py-12 border-b border-gray-100" style={{ backgroundColor: "var(--brand-gray-light)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 p-1.5 bg-gray-200/50 rounded-2xl">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedNotice(null); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeTab === tab.key ? { color: "var(--brand-navy)" } : {}}>
                <tab.icon size={16} />
                {tab.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200/60 text-gray-500">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>
          ) : (
            <>
              {/* Notices */}
              {activeTab === "notice" && !selectedNotice && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--brand-navy)" }}>공지사항</h2>
                  <div className="space-y-3">
                    {noticePag.pagedItems.map((notice: any, index: number) => (
                      <motion.div key={notice.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedNotice(notice)}
                        className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-transparent hover:shadow-lg hover:shadow-blue-900/5 transition-all cursor-pointer group">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {notice.is_pinned && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "var(--brand-orange)" }}>중요</span>}
                            <h3 className="font-semibold truncate group-hover:text-[var(--brand-blue)] transition-colors" style={{ color: "var(--brand-navy)" }}>{notice.title}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                            <span className="flex items-center gap-1"><Eye size={12} />{notice.view_count || 0}</span>
                            <span>{notice.created_at?.split("T")[0]}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {notices.length === 0 && <div className="text-center py-16 text-gray-400">공지사항이 없습니다.</div>}
                  </div>
                  <PaginationBar {...noticePag} />
                </motion.div>
              )}

              {/* Notice Detail */}
              {activeTab === "notice" && selectedNotice && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <button onClick={() => setSelectedNotice(null)} className="flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-70" style={{ color: "var(--brand-blue)" }}>
                    <ChevronUp size={16} />목록으로 돌아가기
                  </button>
                  <div className="bg-white rounded-2xl p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      {selectedNotice.is_pinned && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: "var(--brand-orange)" }}>중요</span>}
                      <span className="text-sm text-gray-400">{selectedNotice.created_at?.split("T")[0]}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--brand-navy)" }}>{selectedNotice.title}</h2>
                    <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedNotice.content}</div>
                  </div>
                </motion.div>
              )}

              {/* FAQs */}
              {activeTab === "faq" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--brand-navy)" }}>자주 묻는 질문</h2>
                  {faqCategories.length > 0 ? faqCategories.map((category) => (
                    <div key={category} className="mb-8">
                      <h3 className="text-sm font-bold uppercase tracking-wider mb-4 px-1" style={{ color: "var(--brand-blue)" }}>{category}</h3>
                      <Accordion type="single" collapsible className="space-y-2">
                        {faqs.filter((f) => f.category === category).map((faq) => (
                          <AccordionItem key={faq.id} value={faq.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow px-6">
                            <AccordionTrigger className="py-5 text-left font-semibold hover:no-underline" style={{ color: "var(--brand-navy)" }}>
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="pb-5 text-sm leading-relaxed" style={{ color: "var(--brand-gray-dark)" }}>
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )) : (
                    /* 카테고리 없는 FAQ 표시 */
                    <Accordion type="single" collapsible className="space-y-2">
                      {faqs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow px-6">
                          <AccordionTrigger className="py-5 text-left font-semibold hover:no-underline" style={{ color: "var(--brand-navy)" }}>
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="pb-5 text-sm leading-relaxed" style={{ color: "var(--brand-gray-dark)" }}>
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                  {faqs.length === 0 && <div className="text-center py-16 text-gray-400">FAQ가 없습니다.</div>}
                </motion.div>
              )}

              {/* Materials */}
              {activeTab === "materials" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--brand-navy)" }}>자료실</h2>
                  <div className="space-y-3">
                    {materialPag.pagedItems.map((material: any, index: number) => (
                      <motion.div key={material.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-transparent transition-all flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}>
                            <FileText size={20} style={{ color: "var(--brand-blue)" }} />
                          </div>
                          <div>
                            <h3 className="font-semibold" style={{ color: "var(--brand-navy)" }}>{material.title}</h3>
                            <div className="flex gap-3 text-xs text-gray-400 mt-1">
                              <span>{material.file_type || material.type || "PDF"}</span>
                              <span>{material.file_size || material.size || "-"}</span>
                              <span>{material.created_at?.split("T")[0] || material.date}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadMaterial(material)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
                          style={{ backgroundColor: "var(--brand-sky)", color: "var(--brand-blue)" }}
                        >
                          <Download size={16} />다운로드
                        </button>
                      </motion.div>
                    ))}
                    {materialList.length === 0 && (
                      <div className="text-center py-16 text-gray-400">
                        <FolderOpen size={40} className="mx-auto mb-3 text-gray-300" />
                        등록된 자료가 없습니다.
                      </div>
                    )}
                  </div>
                  <PaginationBar {...materialPag} />
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <CtaSection
        title="더 궁금한 사항이 있으신가요?"
        subtitle="전문 상담원이 신속하게 답변해드립니다"
        buttonText="문의하기"
      />
    </div>
  );
}