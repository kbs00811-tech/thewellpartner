import { useState, useEffect } from "react";
import { Link } from "react-router";
import { MapPin, DollarSign, Clock, Home, Briefcase, Filter, ArrowRight, ArrowLeft, Search, Loader2, CheckCircle2, Users } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { motion } from "motion/react";
import * as api from "../lib/api";
import { PageHero, CtaSection } from "../components/shared";
import { useSEO } from "../lib/useSEO";
import { jobApplicationSchema, formatZodErrors } from "../lib/schemas";
import { handleError, handleSuccess } from "../lib/error-handler";

export default function Recruit() {
  useSEO({ title: "채용정보", description: "더웰파트너의 최신 채용공고를 확인하세요. 제조, 생산, 물류, 반도체 등 다양한 분야의 일자리를 제공합니다." });
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [filters, setFilters] = useState({ keyword: "", region: "all", category: "all" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await api.publicJobs.list();
      setJobs(Array.isArray(res) ? res : []);
    } catch (e) { handleError(e, { fallback: "채용 정보를 불러오는 데 실패했습니다.", silent: true }); }
    finally { setLoading(false); }
  };

  const filteredJobs = jobs.filter((job) => {
    const regionMatch = filters.region === "all" || (job.work_location || "").includes(filters.region);
    const categoryMatch = filters.category === "all" || job.job_category === filters.category;
    const keywordMatch = !filters.keyword || (job.title || "").includes(filters.keyword) || (job.company_name || "").includes(filters.keyword);
    return regionMatch && categoryMatch && keywordMatch;
  });

  const handleApply = (job: any) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
    setSubmitted(false);
    setFormData({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setFieldErrors({});

    const result = jobApplicationSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(formatZodErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      await api.publicJobs.apply(selectedJob.id, {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || "",
        birthDate: formData.birthDate || "",
        currentAddress: formData.address || "",
        desiredLocation: selectedJob.work_location,
        desiredJob: selectedJob.job_category || "",
        careerSummary: formData.experience || "",
        selfIntro: formData.message || "",
        dormitoryNeeded: selectedJob.dormitory_available || false,
        shiftAvailable: true,
      });
      setSubmitted(true);
      handleSuccess("지원이 완료되었습니다.");
    } catch (err) {
      handleError(err, { fallback: "지원 중 오류가 발생했습니다." });
    } finally { setSubmitting(false); }
  };

  const formatSalary = (job: any) => {
    if (!job.salary_min) return "-";
    if (job.salary_type === "시급") return `시급 ${job.salary_min?.toLocaleString()}원~${job.salary_max?.toLocaleString()}원`;
    return `월 ${(job.salary_min / 10000).toFixed(0)}만원~${(job.salary_max / 10000).toFixed(0)}만원`;
  };

  const categories = [...new Set(jobs.map((j) => j.job_category).filter(Boolean))];
  const locations = [...new Set(jobs.map((j) => {
    const loc = j.work_location || "";
    if (loc.includes("화성")) return "화성";
    if (loc.includes("수원")) return "수원";
    return null;
  }).filter(Boolean))];

  return (
    <div className="w-full">
      {/* Hero */}
      <PageHero
        label="Jobs"
        title="채용정보"
        subtitle="다양한 직무와 근무 조건의 채용 공고를 확인하세요"
        bgImage="/images/pages/recruit-header.png"
      />

      {showApplicationForm && selectedJob ? (
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <button onClick={() => setShowApplicationForm(false)} className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-70" style={{ color: "var(--brand-blue)" }}>
                <ArrowLeft size={16} />목록으로 돌아가기
              </button>
              <div className="mb-8 pb-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--brand-navy)" }}>{selectedJob.title}</h2>
                <p style={{ color: "var(--brand-gray)" }}>{selectedJob.company_name}</p>
              </div>

              {submitted ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--brand-sky)" }}>
                    <CheckCircle2 size={32} style={{ color: "var(--brand-blue)" }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-navy)" }}>지원이 완료되었습니다!</h3>
                  <p className="text-gray-500 mb-6">담당자가 확인 후 빠른 시일 내에 연락드리겠습니다.</p>
                  <button onClick={() => setShowApplicationForm(false)} className="px-8 py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: "var(--brand-blue)" }}>채용정보 돌아가기</button>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="space-y-6" noValidate>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">이름 *</Label>
                      <Input id="name" placeholder="홍길동" required className="mt-1.5" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} aria-invalid={!!fieldErrors.name} />
                      {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">연락처 *</Label>
                      <Input id="phone" placeholder="010-0000-0000" required className="mt-1.5" value={formData.mobile || ""} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} aria-invalid={!!fieldErrors.mobile} />
                      {fieldErrors.mobile && <p className="text-xs text-red-500 mt-1">{fieldErrors.mobile}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label htmlFor="birth">생년월일</Label><Input id="birth" type="date" className="mt-1.5" value={formData.birthDate || ""} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} /></div>
                    <div><Label htmlFor="email">이메일</Label><Input id="email" type="email" placeholder="example@email.com" className="mt-1.5" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  </div>
                  <div><Label htmlFor="address">거주지역</Label><Input id="address" placeholder="경기도 수원시" className="mt-1.5" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                  <div><Label htmlFor="experience">경력사항</Label><Textarea id="experience" placeholder="관련 경력이 있으시다면 작성해주세요." rows={4} className="mt-1.5" value={formData.experience || ""} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} /></div>
                  <div><Label htmlFor="message">자기소개/문의내용</Label><Textarea id="message" placeholder="궁금하신 사항을 자유롭게 작성해주세요." rows={4} className="mt-1.5" value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })} /></div>
                  <div className="pt-4">
                    <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-orange)" }}>
                      {submitting ? <Loader2 size={20} className="animate-spin" /> : <>지원하기<ArrowRight size={20} /></>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Filter */}
          <section className="py-6 border-b border-gray-100" style={{ backgroundColor: "var(--brand-gray-light)" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter style={{ color: "var(--brand-navy)" }} size={18} />
                  <span className="font-semibold text-sm" style={{ color: "var(--brand-navy)" }}>필터</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 flex-1 max-w-xs">
                  <Search size={16} className="text-gray-400" />
                  <input type="text" placeholder="키워드 검색..." className="bg-transparent text-sm flex-1 outline-none" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
                </div>
                <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm">
                  <option value="all">전체 지역</option>
                  {locations.map((loc) => <option key={loc} value={loc!}>{loc}</option>)}
                </select>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm">
                  <option value="all">전체 직무</option>
                  {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <span className="text-sm" style={{ color: "var(--brand-gray)" }}>
                  총 <strong style={{ color: "var(--brand-navy)" }}>{filteredJobs.length}</strong>개의 채용공고
                </span>
              </div>
            </div>
          </section>

          {/* Job List */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {loading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /><span className="ml-3 text-gray-500">채용 정보를 불러오는 중...</span></div>
              ) : (
                <div className="grid gap-5">
                  {filteredJobs.map((job, index) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-transparent hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: job.employment_type === "정규직" ? "rgba(30,86,160,0.1)" : "rgba(42,125,225,0.1)", color: job.employment_type === "정규직" ? "var(--brand-blue)" : "var(--brand-orange)" }}>
                              {job.employment_type}
                            </span>
                            <span className="text-xs" style={{ color: "var(--brand-gray)" }}>{job.job_category}</span>
                            {job.foreigner_allowed && <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>외국인가능</span>}
                          </div>
                          <h3 className="text-xl font-bold mb-1" style={{ color: "var(--brand-navy)" }}>{job.title}</h3>
                          <p className="text-sm mb-4" style={{ color: "var(--brand-gray)" }}>{job.company_name}</p>
                          <div className="flex flex-wrap gap-4 text-sm mb-4" style={{ color: "var(--brand-gray-dark)" }}>
                            <div className="flex items-center gap-1.5"><MapPin size={14} style={{ color: "var(--brand-blue)" }} />{job.work_location}</div>
                            <div className="flex items-center gap-1.5"><DollarSign size={14} style={{ color: "var(--brand-blue)" }} />{formatSalary(job)}</div>
                            <div className="flex items-center gap-1.5"><Clock size={14} style={{ color: "var(--brand-blue)" }} />{job.working_hours}</div>
                            {job.recruitment_count && <div className="flex items-center gap-1.5"><Users size={14} style={{ color: "var(--brand-blue)" }} />{job.recruitment_count}명 모집</div>}
                            {job.dormitory_available && <div className="flex items-center gap-1.5"><Home size={14} style={{ color: "var(--brand-orange)" }} /><span style={{ color: "var(--brand-orange)" }}>기숙사</span></div>}
                          </div>
                          {job.description && <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>}
                        </div>
                        <button onClick={() => handleApply(job)} className="flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-white font-semibold whitespace-nowrap transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]" style={{ backgroundColor: "var(--brand-orange)" }}>
                          지원하기<ArrowRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {filteredJobs.length === 0 && !loading && (
                    <div className="text-center py-20"><p className="text-gray-400">해당 조건에 맞는 채용공고가 없습니다.</p></div>
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* CTA */}
      {!showApplicationForm && (
        <CtaSection
          title="원하는 채용 공고가 없으신가요?"
          subtitle="희망하시는 직무와 조건을 알려주시면 맞춤형 채용 정보를 안내해 드립니다."
          buttonText="채용 문의하기"
        />
      )}
    </div>
  );
}