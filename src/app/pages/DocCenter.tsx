import { useState, useCallback } from "react";
import { Link } from "react-router";
import { FileText, Shield, ArrowRight, CheckCircle2, Loader2, Download, Eye, AlertCircle, User, Calendar, Hash, UserPlus } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import * as api from "../lib/api";
import { PageHero } from "../components/shared";
import { useSEO } from "../lib/useSEO";
import { handleError } from "../lib/error-handler";

type Step = "verify" | "documents";

// 한국어 증명서 HTML → Canvas → PDF 변환
async function generateCertPDF(docType: string, employee: any): Promise<Blob> {
  const html2canvas = (await import("html2canvas")).default;
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, "0")}월 ${String(now.getDate()).padStart(2, "0")}일`;
  const docNo = `TWP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

  const titleMap: Record<string, string> = {
    EMPLOYMENT_CERT: "재 직 증 명 서",
    RESIGNATION_CERT: "퇴 직 증 명 서",
    CAREER_CERT: "경 력 증 명 서",
  };

  const purposeMap: Record<string, string> = {
    EMPLOYMENT_CERT: "위 사람은 현재 당사에 재직하고 있음을 증명합니다.",
    RESIGNATION_CERT: "위 사람은 당사에 근무하다가 퇴직하였음을 증명합니다.",
    CAREER_CERT: "위 사람의 경력 사항이 위와 같음을 증명합니다.",
  };

  // 증명서 HTML 템플릿
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = `
    <div id="cert-render" style="width:794px;min-height:1123px;background:#fff;font-family:'Pretendard','Noto Sans KR',sans-serif;padding:60px 70px;box-sizing:border-box;color:#1a1a1a;position:relative;">
      <!-- 상단 테두리 -->
      <div style="position:absolute;top:20px;left:20px;right:20px;bottom:20px;border:2px solid #1E293B;pointer-events:none;"></div>
      <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border:1px solid #94A3B8;pointer-events:none;"></div>

      <!-- 문서번호 -->
      <div style="text-align:right;font-size:12px;color:#64748B;margin-bottom:30px;">
        문서번호: ${docNo}
      </div>

      <!-- 제목 -->
      <h1 style="text-align:center;font-size:36px;font-weight:800;letter-spacing:12px;margin:30px 0 50px;color:#0F172A;">
        ${titleMap[docType] || "증 명 서"}
      </h1>

      <!-- 인적사항 테이블 -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:40px;font-size:15px;">
        <tr>
          <td style="width:120px;padding:14px 20px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:700;color:#334155;">성 명</td>
          <td style="padding:14px 20px;border:1px solid #E2E8F0;">${employee.name || "-"}</td>
          <td style="width:120px;padding:14px 20px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:700;color:#334155;">사 번</td>
          <td style="padding:14px 20px;border:1px solid #E2E8F0;">${employee.employeeNo || "-"}</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:700;color:#334155;">부 서</td>
          <td style="padding:14px 20px;border:1px solid #E2E8F0;">${employee.department || "-"}</td>
          <td style="padding:14px 20px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:700;color:#334155;">직 위</td>
          <td style="padding:14px 20px;border:1px solid #E2E8F0;">${employee.position || "-"}</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:700;color:#334155;">발급일자</td>
          <td colspan="3" style="padding:14px 20px;border:1px solid #E2E8F0;">${dateStr}</td>
        </tr>
      </table>

      <!-- 증명 내용 -->
      <div style="text-align:center;font-size:18px;line-height:2;margin:60px 0 80px;color:#1E293B;">
        ${purposeMap[docType] || "위 사항을 증명합니다."}
      </div>

      <!-- 발급일 -->
      <div style="text-align:center;font-size:16px;color:#475569;margin-bottom:60px;">
        ${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, "0")}월 ${String(now.getDate()).padStart(2, "0")}일
      </div>

      <!-- 회사 정보 + 직인 -->
      <div style="text-align:center;margin-top:20px;">
        <div style="font-size:22px;font-weight:800;color:#0F172A;letter-spacing:4px;margin-bottom:8px;">
          주식회사 더웰파트너
        </div>
        <div style="font-size:15px;color:#64748B;margin-bottom:6px;">
          대표이사 김범석
        </div>
        <!-- 직인 (추후 이미지로 교체 가능) -->
        <div style="display:inline-block;width:90px;height:90px;border:3px solid #DC2626;border-radius:50%;margin-top:10px;position:relative;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#DC2626;letter-spacing:1px;">주식회사</div>
            <div style="font-size:14px;font-weight:900;color:#DC2626;letter-spacing:2px;">더웰파트너</div>
            <div style="font-size:9px;color:#DC2626;">대표이사인</div>
          </div>
        </div>
      </div>

      <!-- 하단 회사 정보 -->
      <div style="position:absolute;bottom:40px;left:70px;right:70px;border-top:1px solid #E2E8F0;padding-top:15px;font-size:11px;color:#94A3B8;text-align:center;">
        경기도 수원시 권선구 경수대로 371 2층 | TEL: 1666-7663 | FAX: 031-298-7663 | E-mail: 2021thewell@gmail.com
      </div>
    </div>
  `;

  document.body.appendChild(container);
  const el = document.getElementById("cert-render")!;

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
  return pdf.output("blob");
}

export default function DocCenter() {
  useSEO({ title: "서류발급센터", description: "재직증명서, 급여명세서 등 각종 서류를 온라인으로 간편하게 발급받으세요." });
  const [step, setStep] = useState<Step>("verify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [issuingDoc, setIssuingDoc] = useState<string | null>(null);

  // Verify form (핸드폰 인증 제거 — 사번+이름+생년월일만)
  const [verifyForm, setVerifyForm] = useState({ employeeNo: "", name: "", birthDate: "" });

  // Document access
  const [docToken, setDocToken] = useState("");
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [payrollDocs, setPayrollDocs] = useState<any[]>([]);

  // 직접 인증 (SMS 없이 사번+이름+생년월일로 바로 인증)
  const handleDirectVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.publicDocs.directVerify({
        employeeNo: verifyForm.employeeNo,
        name: verifyForm.name,
        birthDate: verifyForm.birthDate,
      });
      setDocToken(res.accessToken);
      setEmployeeInfo(res.employee);
      setAvailableDocs(res.documents || []);
      // Load payroll
      try {
        const payRes = await api.publicDocs.getPayroll(res.accessToken);
        setPayrollDocs(payRes || []);
      } catch { setPayrollDocs([]); }
      setStep("documents");
    } catch (e: any) {
      setError(e.message || "인증에 실패했습니다. 입력 정보를 확인해주세요.");
    } finally { setLoading(false); }
  };

  // Issue document (generate PDF + record)
  const handleIssueDoc = useCallback(async (docType: string, docName: string) => {
    if (!docToken || !employeeInfo) return;
    setIssuingDoc(docType);
    try {
      await api.publicDocs.issueDoc(docToken, { docType, docTypeName: docName });
      const blob = await generateCertPDF(docType, employeeInfo);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nameMap: Record<string, string> = {
        EMPLOYMENT_CERT: "재직증명서",
        RESIGNATION_CERT: "퇴직증명서",
        CAREER_CERT: "경력증명서",
      };
      link.download = `${nameMap[docType] || docType}_${employeeInfo.name}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      handleError(e, { fallback: "서류 발급에 실패했습니다." });
    } finally {
      setIssuingDoc(null);
    }
  }, [docToken, employeeInfo]);

  return (
    <div className="w-full">
      {/* Hero */}
      <PageHero
        label="Document Center"
        title="서류발급센터"
        subtitle="재직증명서, 급여명세서 등 각종 서류를 온라인으로 간편하게 발급받으세요"
        bgImage="/images/pages/docs-header.png"
      />

      {/* Steps Indicator */}
      <section className="py-8 border-b border-gray-100" style={{ backgroundColor: "var(--brand-gray-light)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            {[
              { key: "verify", label: "본인인증", num: 1 },
              { key: "documents", label: "서류발급", num: 2 },
            ].map((s, i) => {
              const isActive = s.key === step;
              const isDone = step === "documents" && s.num === 1;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  {i > 0 && <div className={`w-12 h-0.5 ${isDone || isActive ? "bg-[var(--brand-blue)]" : "bg-gray-300"}`} />}
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDone ? "bg-[var(--brand-blue)] text-white" : isActive ? "bg-[var(--brand-orange)] text-white" : "bg-gray-200 text-gray-400"}`}>
                      {isDone ? <CheckCircle2 size={16} /> : s.num}
                    </div>
                    <span className={`text-sm font-semibold ${isActive ? "text-[var(--brand-navy)]" : "text-gray-400"}`}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">

            {/* STEP 1: Verify Identity */}
            {step === "verify" && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--brand-blue), var(--brand-navy))" }}>
                      <Shield className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: "var(--brand-navy)" }}>본인인증</h2>
                      <p className="text-sm text-gray-400">직원 정보를 입력해주세요</p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm mb-5">
                      <AlertCircle size={16} />{error}
                    </div>
                  )}

                  <form onSubmit={handleDirectVerify} className="space-y-5">
                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5"><Hash size={14} />사번 *</Label>
                      <Input placeholder="예: EMP-001" required value={verifyForm.employeeNo} onChange={(e) => setVerifyForm({ ...verifyForm, employeeNo: e.target.value })} />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5"><User size={14} />이름 *</Label>
                      <Input placeholder="홍길동" required value={verifyForm.name} onChange={(e) => setVerifyForm({ ...verifyForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5"><Calendar size={14} />생년월일 *</Label>
                      <Input type="date" required value={verifyForm.birthDate} onChange={(e) => setVerifyForm({ ...verifyForm, birthDate: e.target.value })} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                      {loading ? <Loader2 size={20} className="animate-spin" /> : <>본인인증 및 서류조회<ArrowRight size={20} /></>}
                    </button>
                  </form>

                  <div className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus size={14} style={{ color: "var(--brand-blue)" }} />
                      <span className="text-sm font-semibold" style={{ color: "var(--brand-navy)" }}>사번이 없으신가요?</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">사원 등록을 먼저 진행하면 사번을 발급받을 수 있습니다.</p>
                    <Link to="/register" className="inline-flex items-center gap-1 text-xs font-semibold hover:gap-2 transition-all" style={{ color: "var(--brand-blue)" }}>
                      사원 등록하러 가기 <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Documents */}
            {step === "documents" && (
              <motion.div key="documents" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Employee Info Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: "var(--brand-blue)" }}>
                      {(employeeInfo?.name || "?")[0]}
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{employeeInfo?.name}</div>
                      <div className="text-sm text-gray-400">{employeeInfo?.employeeNo} · {employeeInfo?.department}</div>
                    </div>
                    <div className="ml-auto">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">인증완료</span>
                    </div>
                  </div>
                </div>

                {/* Certificates */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                  <h3 className="text-lg font-bold mb-5" style={{ color: "var(--brand-navy)" }}>증명서 발급</h3>
                  <div className="space-y-3">
                    {availableDocs.map((doc: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${doc.available ? "border-gray-100 hover:shadow-md hover:border-transparent" : "border-gray-100 opacity-50"} transition-all`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: doc.available ? "var(--brand-sky)" : "#f0f0f0" }}>
                            <FileText size={18} style={{ color: doc.available ? "var(--brand-blue)" : "#999" }} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "var(--brand-navy)" }}>{doc.name}</div>
                            <div className="text-xs text-gray-400">{doc.available ? "발급 가능" : "발급 불가"}</div>
                          </div>
                        </div>
                        {doc.available ? (
                          <button
                            onClick={() => handleIssueDoc(doc.docType, doc.name)}
                            disabled={issuingDoc === doc.docType}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
                            style={{ backgroundColor: "var(--brand-blue)" }}
                          >
                            {issuingDoc === doc.docType ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            {issuingDoc === doc.docType ? "발급중..." : "발급"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">해당 없음</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payroll */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                  <h3 className="text-lg font-bold mb-5" style={{ color: "var(--brand-navy)" }}>급여명세서</h3>
                  {payrollDocs.length > 0 ? (
                    <div className="space-y-3">
                      {payrollDocs.map((pay: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:shadow-md hover:border-transparent transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.1)" }}>
                              <FileText size={18} style={{ color: "#8b5cf6" }} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: "var(--brand-navy)" }}>{pay.pay_year || pay.pay_year_month?.split("-")[0]}년 {pay.pay_month || pay.pay_year_month?.split("-")[1]}월</div>
                              <div className="text-xs text-gray-400">실수령액: {(pay.net_pay || 0).toLocaleString()}원</div>
                            </div>
                          </div>
                          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
                            <Eye size={14} />조회
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">등록된 급여명세서가 없습니다.</div>
                  )}
                </div>

                <button onClick={() => { setStep("verify"); setDocToken(""); setError(""); setVerifyForm({ employeeNo: "", name: "", birthDate: "" }); }} className="w-full py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                  다른 직원 인증하기
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16" style={{ backgroundColor: "var(--brand-gray-light)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-7 border border-gray-100">
              <h3 className="font-bold mb-4" style={{ color: "var(--brand-navy)" }}>발급 가능 서류</h3>
              <ul className="space-y-2.5">
                {[
                  { name: "재직증명서", method: "자동 생성 (PDF)" },
                  { name: "퇴직증명서", method: "자동 생성 (PDF)" },
                  { name: "경력증명서", method: "자동 생성 (PDF)" },
                  { name: "급여명세서", method: "관리자 업로드" },
                  { name: "원천징수영수증", method: "관리자 업로드" },
                ].map((doc, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: "var(--brand-blue)" }} />{doc.name}</span>
                    <span className="text-xs text-gray-400 px-2 py-0.5 rounded-md bg-gray-50">{doc.method}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-100">
              <h3 className="font-bold mb-4" style={{ color: "var(--brand-navy)" }}>이용 안내</h3>
              <ul className="space-y-2.5 text-sm" style={{ color: "var(--brand-gray-dark)" }}>
                <li className="flex items-start gap-2"><span className="text-[var(--brand-blue)] font-bold">1.</span>사번, 이름, 생년월일을 입력하여 본인인증을 진행합니다</li>
                <li className="flex items-start gap-2"><span className="text-[var(--brand-blue)] font-bold">2.</span>인증 완료 후 필요한 서류를 다운로드합니다</li>
                <li className="flex items-start gap-2"><span className="text-[var(--brand-blue)] font-bold">3.</span>증명서는 PDF로 자동 생성되어 다운로드됩니다</li>
              </ul>
              <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-700">
                <strong>문의:</strong> 서류 발급 관련 문의는 대표전화로 연락주세요.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
