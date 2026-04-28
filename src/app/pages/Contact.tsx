import { useState } from "react";
import { Building2, User, Phone, Mail, MapPin, ArrowRight, Send, CheckCircle2, Loader2, ExternalLink, Clock, Navigation } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { motion } from "motion/react";
import * as api from "../lib/api";
import { PageHero } from "../components/shared";
import { useCompanyInfo, display } from "../components/CompanyInfoContext";
import { useSEO } from "../lib/useSEO";
import { companyInquirySchema, seekerInquirySchema, formatZodErrors } from "../lib/schemas";
import { handleError, handleSuccess } from "../lib/error-handler";
import { JOB_CATEGORIES } from "../constants";

export default function Contact() {
  const { info } = useCompanyInfo();
  useSEO({ title: "문의하기", description: "더웰파트너에 기업 인력 상담 및 구직 문의를 접수하세요. 전문 상담원이 빠르게 답변해드립니다." });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeForm, setActiveForm] = useState<"company" | "jobseeker">("company");
  const [companyForm, setCompanyForm] = useState<any>({});
  const [seekerForm, setSeekerForm] = useState<any>({});
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const phone = display(info.phone, "031-XXX-XXXX");
  const email = display(info.email, "contact@thewellpartner.com");
  const address = display(info.address, "경기도 수원시 (본사)");
  const businessHours = display(info.business_hours, "평일 09:00 ~ 18:00 (공휴일 제외)");

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = companyInquirySchema.safeParse(companyForm);
    if (!result.success) {
      setFieldErrors(formatZodErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      await api.publicInquiry.submit({
        inquiryType: "COMPANY",
        companyName: companyForm.companyName,
        name: companyForm.managerName,
        mobile: companyForm.phone,
        email: companyForm.email,
        title: `[기업문의] ${companyForm.companyName} - ${companyForm.jobType || "인력 문의"}`,
        content: `필요 직무: ${companyForm.jobType || "-"}\n필요 인원: ${companyForm.headcount || "-"}\n근무지: ${companyForm.location || "-"}\n\n${companyForm.message || ""}`,
      });
      setSubmitted(true);
      handleSuccess("문의가 성공적으로 접수되었습니다.");
    } catch (err) { handleError(err, { fallback: "문의 접수 중 오류가 발생했습니다." }); }
    finally { setSubmitting(false); }
  };

  const handleSeekerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = seekerInquirySchema.safeParse(seekerForm);
    if (!result.success) {
      setFieldErrors(formatZodErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      await api.publicInquiry.submit({
        inquiryType: "JOB_SEEKER",
        name: seekerForm.name,
        mobile: seekerForm.phone,
        email: "",
        title: `[구직문의] ${seekerForm.name} - ${seekerForm.job || "일반 문의"}`,
        content: `희망 근무지: ${seekerForm.location || "-"}\n희망 직무: ${seekerForm.job || "-"}\n경력: ${seekerForm.experience || "-"}\n\n${seekerForm.message || ""}`,
      });
      setSubmitted(true);
      handleSuccess("문의가 성공적으로 접수되었습니다.");
    } catch (err) { handleError(err, { fallback: "문의 접수 중 오류가 발생했습니다." }); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setSubmitted(false);
    setCompanyForm({});
    setSeekerForm({});
    setPrivacyAgreed(false);
    setFieldErrors({});
  };

  const FieldError = ({ name }: { name: string }) =>
    fieldErrors[name] ? <p className="text-xs text-red-500 mt-1">{fieldErrors[name]}</p> : null;

  return (
    <div className="w-full">
      <PageHero label="Contact Us" title="문의하기" subtitle="전문 상담원이 신속하고 정확하게 답변해 드립니다" />

      {/* Contact Info Cards */}
      <section className="py-12" style={{ backgroundColor: "var(--brand-gray-light)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Phone, title: "전화 상담", value: phone, sub: businessHours },
              { icon: Mail, title: "이메일 상담", value: email, sub: "24시간 접수" },
              { icon: MapPin, title: "방문 상담", value: address, sub: "사전 예약 필수" },
            ].map((info, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-7 border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, var(--brand-blue), var(--brand-navy))" }}>
                  <info.icon className="text-white" size={24} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "var(--brand-navy)" }}>{info.title}</h3>
                <p className="font-medium text-sm mb-1" style={{ color: "var(--brand-navy)" }}>{info.value}</p>
                <p className="text-xs" style={{ color: "var(--brand-gray)" }}>{info.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--brand-navy)" }}>빠른 상담 신청</h2>
            <p style={{ color: "var(--brand-gray)" }}>문의사항을 남겨주시면 24시간 이내에 연락드리겠습니다</p>
          </div>

          <div className="flex gap-2 mb-8 p-1.5 bg-gray-100 rounded-2xl max-w-md mx-auto" role="tablist">
            <button role="tab" aria-selected={activeForm === "company"} onClick={() => { setActiveForm("company"); resetForm(); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeForm === "company" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeForm === "company" ? { color: "var(--brand-navy)" } : {}}>
              <Building2 size={16} />기업고객 문의
            </button>
            <button role="tab" aria-selected={activeForm === "jobseeker"} onClick={() => { setActiveForm("jobseeker"); resetForm(); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${activeForm === "jobseeker" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeForm === "jobseeker" ? { color: "var(--brand-navy)" } : {}}>
              <User size={16} />구직자 문의
            </button>
          </div>

          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "var(--brand-sky)" }}>
                <CheckCircle2 size={40} style={{ color: "var(--brand-blue)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--brand-navy)" }}>문의가 접수되었습니다!</h3>
              <p className="text-gray-500 mb-8">담당자가 확인 후 빠른 시일 내에 연락드리겠습니다.</p>
              <button onClick={resetForm} className="px-8 py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: "var(--brand-blue)" }}>추가 문의하기</button>
            </motion.div>
          ) : (
            <>
              {activeForm === "company" && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 shadow-sm">
                  <form onSubmit={handleCompanySubmit} className="space-y-6" noValidate>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="company-name">회사명 *</Label>
                        <Input id="company-name" placeholder="(주)OO기업" required className="mt-1.5" value={companyForm.companyName || ""} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} aria-invalid={!!fieldErrors.companyName} />
                        <FieldError name="companyName" />
                      </div>
                      <div>
                        <Label htmlFor="manager-name">담당자명 *</Label>
                        <Input id="manager-name" placeholder="홍길동" required className="mt-1.5" value={companyForm.managerName || ""} onChange={(e) => setCompanyForm({ ...companyForm, managerName: e.target.value })} aria-invalid={!!fieldErrors.managerName} />
                        <FieldError name="managerName" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="company-phone">연락처 *</Label>
                        <Input id="company-phone" placeholder="010-0000-0000" required className="mt-1.5" value={companyForm.phone || ""} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} aria-invalid={!!fieldErrors.phone} />
                        <FieldError name="phone" />
                      </div>
                      <div>
                        <Label htmlFor="company-email">이메일 *</Label>
                        <Input id="company-email" type="email" placeholder="example@company.com" required className="mt-1.5" value={companyForm.email || ""} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} aria-invalid={!!fieldErrors.email} />
                        <FieldError name="email" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="job-type">필요 직무</Label>
                        <Select value={companyForm.jobType || ""} onValueChange={(v) => setCompanyForm({ ...companyForm, jobType: v })}>
                          <SelectTrigger id="job-type" className="mt-1.5"><SelectValue placeholder="선택하세요" /></SelectTrigger>
                          <SelectContent>
                            {JOB_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label htmlFor="headcount">필요 인원</Label><Input id="headcount" placeholder="예: 10명" className="mt-1.5" value={companyForm.headcount || ""} onChange={(e) => setCompanyForm({ ...companyForm, headcount: e.target.value })} /></div>
                    </div>
                    <div>
                      <Label htmlFor="company-location">근무지 *</Label>
                      <Input id="company-location" placeholder="경기도 수원시" required className="mt-1.5" value={companyForm.location || ""} onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })} aria-invalid={!!fieldErrors.location} />
                      <FieldError name="location" />
                    </div>
                    <div>
                      <Label htmlFor="company-message">문의 내용 *</Label>
                      <Textarea id="company-message" placeholder="구체적인 요구사항을 작성해주시면 더 정확한 상담이 가능합니다." rows={6} required className="mt-1.5" value={companyForm.message || ""} onChange={(e) => setCompanyForm({ ...companyForm, message: e.target.value })} aria-invalid={!!fieldErrors.message} />
                      <FieldError name="message" />
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                      <div className="text-xs text-gray-500 leading-relaxed mb-3">
                        <strong className="text-gray-700">개인정보 수집·이용 동의</strong><br />
                        수집항목: 회사명, 담당자명, 연락처, 이메일 | 이용목적: 상담 접수 및 회신 | 보유기간: 상담 완료 후 1년<br />
                        동의를 거부하실 수 있으며, 거부 시 상담 접수가 제한됩니다.
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]" />
                        <span className="text-sm font-medium text-gray-700">개인정보 수집·이용에 동의합니다 <span className="text-red-500">*</span></span>
                      </label>
                    </div>
                    <div className="pt-4">
                      <button type="submit" disabled={submitting || !privacyAgreed} className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-orange)" }}>
                        {submitting ? <Loader2 size={20} className="animate-spin" /> : <>상담 신청하기<ArrowRight size={20} /></>}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeForm === "jobseeker" && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 shadow-sm">
                  <form onSubmit={handleSeekerSubmit} className="space-y-6" noValidate>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="seeker-name">이름 *</Label>
                        <Input id="seeker-name" placeholder="홍길동" required className="mt-1.5" value={seekerForm.name || ""} onChange={(e) => setSeekerForm({ ...seekerForm, name: e.target.value })} aria-invalid={!!fieldErrors.name} />
                        <FieldError name="name" />
                      </div>
                      <div>
                        <Label htmlFor="seeker-phone">연락처 *</Label>
                        <Input id="seeker-phone" placeholder="010-0000-0000" required className="mt-1.5" value={seekerForm.phone || ""} onChange={(e) => setSeekerForm({ ...seekerForm, phone: e.target.value })} aria-invalid={!!fieldErrors.phone} />
                        <FieldError name="phone" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="seeker-location">희망 근무지 *</Label>
                        <Input id="seeker-location" placeholder="경기도 수원시" required className="mt-1.5" value={seekerForm.location || ""} onChange={(e) => setSeekerForm({ ...seekerForm, location: e.target.value })} aria-invalid={!!fieldErrors.location} />
                        <FieldError name="location" />
                      </div>
                      <div>
                        <Label htmlFor="seeker-job">희망 직무</Label>
                        <Select value={seekerForm.job || ""} onValueChange={(v) => setSeekerForm({ ...seekerForm, job: v })}>
                          <SelectTrigger id="seeker-job" className="mt-1.5"><SelectValue placeholder="선택하세요" /></SelectTrigger>
                          <SelectContent>
                            {JOB_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label htmlFor="seeker-message">문의 내용</Label><Textarea id="seeker-message" placeholder="희망 근무 조건, 급여, 기숙사 여부 등을 자유롭게 작성해주세요." rows={6} className="mt-1.5" value={seekerForm.message || ""} onChange={(e) => setSeekerForm({ ...seekerForm, message: e.target.value })} /></div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                      <div className="text-xs text-gray-500 leading-relaxed mb-3">
                        <strong className="text-gray-700">개인정보 수집·이용 동의</strong><br />
                        수집항목: 이름, 연락처 | 이용목적: 채용 상담 및 구직 정보 안내 | 보유기간: 상담 완료 후 1년<br />
                        동의를 거부하실 수 있으며, 거부 시 문의 접수가 제한됩니다.
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]" />
                        <span className="text-sm font-medium text-gray-700">개인정보 수집·이용에 동의합니다 <span className="text-red-500">*</span></span>
                      </label>
                    </div>
                    <div className="pt-4">
                      <button type="submit" disabled={submitting || !privacyAgreed} className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-orange)" }}>
                        {submitting ? <Loader2 size={20} className="animate-spin" /> : <>문의하기<ArrowRight size={20} /></>}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-24" style={{ backgroundColor: "var(--brand-gray-light)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--brand-navy)" }}>상담 안내</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "기업 고객", icon: Building2, items: ["필요하신 인력 규모와 직무를 상세히 알려주세요", "근무 조건(시간, 급여, 계약 기간)을 명시해주세요", "무료 견적 및 맞춤형 제안서를 제공해드립니다", "급여/근태/보험 통합 관리 시스템 시연 가능"] },
              { title: "구직자", icon: User, items: ["희망 근무지와 직무를 알려주세요", "경력 및 자격증이 있다면 함께 알려주세요", "맞춤형 채용 정보를 우선 안내해드립니다", "기숙사, 식사 제공 등 복리후생 안내"] },
            ].map((section, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.1 }} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}><section.icon size={20} style={{ color: "var(--brand-blue)" }} /></div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{section.title}</h3>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--brand-orange)" }} />
                      <span className="text-sm" style={{ color: "var(--brand-gray-dark)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 오시는 길 */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: "var(--brand-sky)", color: "var(--brand-blue)" }}>Location</span>
            <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--brand-navy)" }}>오시는 길</h2>
            <p style={{ color: "var(--brand-gray)" }}>더웰파트너 본사를 방문해주세요</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-100" style={{ minHeight: 420 }}>
              <iframe
                src={`https://map.kakao.com/?q=${encodeURIComponent(address)}&urlLevel=3&urlX=&urlY=&map_type=TYPE_MAP`}
                title="더웰파트너 본사 약도"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 420 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute top-4 left-4 px-4 py-2.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg pointer-events-none">
                <div className="flex items-center gap-2" style={{ color: "var(--brand-navy)" }}>
                  <MapPin size={16} style={{ color: "var(--brand-blue)" }} />
                  <span className="font-bold text-sm">더웰파트너 본사</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{address}</p>
              </div>
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 backdrop-blur-sm text-sm font-semibold shadow-lg hover:bg-white transition-colors"
                style={{ color: "var(--brand-blue)" }}
              >
                <Navigation size={14} />길찾기<ExternalLink size={12} />
              </a>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}><MapPin size={18} style={{ color: "var(--brand-blue)" }} /></div>
                  <h3 className="font-bold" style={{ color: "var(--brand-navy)" }}>주소</h3>
                </div>
                <p className="text-sm mb-1" style={{ color: "var(--brand-gray-dark)" }}>{address}</p>
                <p className="text-xs text-gray-400">방문 시 사전 예약 필수</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}><Phone size={18} style={{ color: "var(--brand-blue)" }} /></div>
                  <h3 className="font-bold" style={{ color: "var(--brand-navy)" }}>연락처</h3>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--brand-navy)" }}>{phone}</p>
                <p className="text-sm" style={{ color: "var(--brand-gray-dark)" }}>{email}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}><Clock size={18} style={{ color: "var(--brand-blue)" }} /></div>
                  <h3 className="font-bold" style={{ color: "var(--brand-navy)" }}>영업시간</h3>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-500">평일</span><span className="font-medium" style={{ color: "var(--brand-navy)" }}>09:00 ~ 18:00</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-500">점심시간</span><span className="font-medium" style={{ color: "var(--brand-navy)" }}>12:00 ~ 13:00</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-500">주말/공휴일</span><span className="font-medium text-red-500">휴무</span></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold mb-3" style={{ color: "var(--brand-navy)" }}>교통편 안내</h3>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: "#1a73e8" }}>지하철</span>
                    <span style={{ color: "var(--brand-gray-dark)" }}>1호선 인근역 하차, 도보 10분</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: "#0f9d58" }}>버스</span>
                    <span style={{ color: "var(--brand-gray-dark)" }}>시내버스 인근 정류장 하차</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: "#f59e0b" }}>자가용</span>
                    <span style={{ color: "var(--brand-gray-dark)" }}>건물 내 주차장 이용 가능 (방문 주차 2시간 무료)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
