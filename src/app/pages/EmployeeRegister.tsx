import { useState } from "react";
import { Link } from "react-router";
import {
  UserPlus, Search, User, Calendar, Phone, Mail, Building2, MapPin,
  ArrowRight, CheckCircle2, Loader2, AlertCircle, Copy, FileText, MessageSquare,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { motion, AnimatePresence } from "motion/react";
import * as api from "../lib/api";
import { PageHero } from "../components/shared";
import { useSEO } from "../lib/useSEO";
import { employeeRegisterSchema, employeeLookupSchema, formatZodErrors } from "../lib/schemas";
import { handleError } from "../lib/error-handler";
import { EMPLOYEE_STATUS_LABELS } from "../constants";

type Mode = "select" | "register" | "lookup";

export default function EmployeeRegister() {
  useSEO({ title: "사원등록", description: "더웰파트너 사원 등록 및 사번 조회 서비스입니다. 사원번호를 발급받으세요." });
  const [mode, setMode] = useState<Mode>("select");

  // Register form
  const [regForm, setRegForm] = useState<any>({});
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState<any>(null);
  const [regError, setRegError] = useState("");
  const [regFieldErrors, setRegFieldErrors] = useState<Record<string, string>>({});

  // Lookup form
  const [lookupForm, setLookupForm] = useState<any>({});
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupFieldErrors, setLookupFieldErrors] = useState<Record<string, string>>({});

  const [copied, setCopied] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegFieldErrors({});

    const result = employeeRegisterSchema.safeParse(regForm);
    if (!result.success) {
      setRegFieldErrors(formatZodErrors(result.error));
      return;
    }

    setRegLoading(true);
    try {
      const res = await api.publicEmployee.register({
        name: regForm.name,
        birthDate: regForm.birthDate,
        mobile: regForm.mobile,
        email: regForm.email || "",
        nationality: regForm.nationality || "한국",
        desiredDepartment: regForm.department || "",
        desiredSite: regForm.site || "",
        message: regForm.message || "",
      });
      setRegResult(res);
    } catch (err) {
      const msg = handleError(err, { fallback: "등록 중 오류가 발생했습니다.", silent: true });
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setLookupFieldErrors({});

    const result = employeeLookupSchema.safeParse(lookupForm);
    if (!result.success) {
      setLookupFieldErrors(formatZodErrors(result.error));
      return;
    }

    setLookupLoading(true);
    try {
      const res = await api.publicEmployee.lookup({
        name: lookupForm.name,
        mobile: lookupForm.mobile,
        birthDate: lookupForm.birthDate || "",
      });
      setLookupResult(res);
    } catch (err) {
      const msg = handleError(err, { fallback: "사번 조회에 실패했습니다.", silent: true });
      setLookupError(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const STATUS_LABELS = EMPLOYEE_STATUS_LABELS;

  return (
    <div className="w-full">
      {/* Hero */}
      <PageHero
        label="Employee Registration"
        title="사원 등록"
        subtitle="사원 등록을 통해 사번을 발급받고, 서류발급센터를 이용하세요"
      />

      {/* Mode Selection or Form */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {/* ── Mode Select ── */}
            {mode === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <div className="text-center mb-10">
                  <h2
                    className="text-2xl font-bold mb-3"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    원하시는 서비스를 선택해주세요
                  </h2>
                  <p style={{ color: "var(--brand-gray)" }}>
                    신규 사원 등록 또는 기존 사번 조회를 할 수 있습니다
                  </p>
                </div>

                <div className="grid gap-5">
                  {/* Register Card */}
                  <button
                    onClick={() => setMode("register")}
                    className="group text-left bg-white rounded-2xl p-7 border border-gray-100 hover:border-transparent hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--brand-blue), var(--brand-navy))",
                        }}
                      >
                        <UserPlus className="text-white" size={26} />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="text-lg font-bold mb-1.5"
                          style={{ color: "var(--brand-navy)" }}
                        >
                          신규 사원 등록
                        </h3>
                        <p
                          className="text-sm leading-relaxed mb-3"
                          style={{ color: "var(--brand-gray)" }}
                        >
                          처음 등록하시는 분은 기본 정보를 입력하고 사번을
                          발급받으세요. 발급된 사번으로 서류발급센터를 이용할 수
                          있습니다.
                        </p>
                        <div
                          className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-3 transition-all"
                          style={{ color: "var(--brand-blue)" }}
                        >
                          사원 등록하기 <ArrowRight size={15} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Lookup Card */}
                  <button
                    onClick={() => setMode("lookup")}
                    className="group text-left bg-white rounded-2xl p-7 border border-gray-100 hover:border-transparent hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: "var(--brand-sky)" }}
                      >
                        <Search
                          size={26}
                          style={{ color: "var(--brand-blue)" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="text-lg font-bold mb-1.5"
                          style={{ color: "var(--brand-navy)" }}
                        >
                          사번 조회
                        </h3>
                        <p
                          className="text-sm leading-relaxed mb-3"
                          style={{ color: "var(--brand-gray)" }}
                        >
                          이미 등록하셨지만 사번을 잊으셨나요? 이름과 연락처로
                          사번을 다시 확인할 수 있습니다.
                        </p>
                        <div
                          className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-3 transition-all"
                          style={{ color: "var(--brand-blue)" }}
                        >
                          사번 조회하기 <ArrowRight size={15} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Quick Link to DocCenter */}
                  <Link
                    to="/docs"
                    className="group text-left bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:bg-white hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "rgba(139,92,246,0.1)" }}
                      >
                        <FileText size={20} style={{ color: "#8b5cf6" }} />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="font-bold text-sm"
                          style={{ color: "var(--brand-navy)" }}
                        >
                          사번을 이미 알고 계신가요?
                        </h3>
                        <p className="text-xs text-gray-400">
                          서류발급센터에서 바로 서류를 발급받으세요
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-gray-300 group-hover:text-[var(--brand-blue)] transition-colors"
                      />
                    </div>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ── Register Form ── */}
            {mode === "register" && !regResult && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                  <button
                    onClick={() => {
                      setMode("select");
                      setRegError("");
                    }}
                    className="flex items-center gap-1 text-sm font-medium mb-6 text-gray-400 hover:text-gray-600"
                  >
                    <ArrowRight size={16} className="rotate-180" />
                    뒤로 가기
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--brand-blue), var(--brand-navy))",
                      }}
                    >
                      <UserPlus className="text-white" size={24} />
                    </div>
                    <div>
                      <h2
                        className="text-xl font-bold"
                        style={{ color: "var(--brand-navy)" }}
                      >
                        신규 사원 등록
                      </h2>
                      <p className="text-sm text-gray-400">
                        기본 정보를 입력해 사번을 발급받으세요
                      </p>
                    </div>
                  </div>

                  {regError && (
                    <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 text-red-600 text-sm mb-5">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-5" noValidate>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1.5 mb-1.5">
                          <User size={14} />
                          이름 *
                        </Label>
                        <Input
                          placeholder="홍길동"
                          required
                          value={regForm.name || ""}
                          onChange={(e) =>
                            setRegForm({ ...regForm, name: e.target.value })
                          }
                          aria-invalid={!!regFieldErrors.name}
                        />
                        {regFieldErrors.name && <p className="text-xs text-red-500 mt-1">{regFieldErrors.name}</p>}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5 mb-1.5">
                          <Calendar size={14} />
                          생년월일 *
                        </Label>
                        <Input
                          type="date"
                          required
                          value={regForm.birthDate || ""}
                          onChange={(e) =>
                            setRegForm({
                              ...regForm,
                              birthDate: e.target.value,
                            })
                          }
                          aria-invalid={!!regFieldErrors.birthDate}
                        />
                        {regFieldErrors.birthDate && <p className="text-xs text-red-500 mt-1">{regFieldErrors.birthDate}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1.5 mb-1.5">
                          <Phone size={14} />
                          연락처 *
                        </Label>
                        <Input
                          placeholder="010-0000-0000"
                          required
                          value={regForm.mobile || ""}
                          onChange={(e) =>
                            setRegForm({ ...regForm, mobile: e.target.value })
                          }
                          aria-invalid={!!regFieldErrors.mobile}
                        />
                        {regFieldErrors.mobile && <p className="text-xs text-red-500 mt-1">{regFieldErrors.mobile}</p>}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5 mb-1.5">
                          <Mail size={14} />
                          이메일
                        </Label>
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          value={regForm.email || ""}
                          onChange={(e) =>
                            setRegForm({ ...regForm, email: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1.5 mb-1.5">
                          <Building2 size={14} />
                          희망 부서
                        </Label>
                        <Input
                          placeholder="예: 생산팀, 물류팀"
                          value={regForm.department || ""}
                          onChange={(e) =>
                            setRegForm({
                              ...regForm,
                              department: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5 mb-1.5">
                          <MapPin size={14} />
                          희망 배치 현장
                        </Label>
                        <Input
                          placeholder="예: 수원, 화성"
                          value={regForm.site || ""}
                          onChange={(e) =>
                            setRegForm({ ...regForm, site: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquare size={14} />
                        추가 메모
                      </Label>
                      <Textarea
                        placeholder="경력, 자격증, 특이사항 등을 자유롭게 작성해주세요."
                        rows={3}
                        value={regForm.message || ""}
                        onChange={(e) =>
                          setRegForm({ ...regForm, message: e.target.value })
                        }
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: "var(--brand-orange)" }}
                    >
                      {regLoading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          사번 발급 신청
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ── Register Success ── */}
            {mode === "register" && regResult && (
              <motion.div
                key="reg-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: "var(--brand-sky)" }}
                  >
                    <CheckCircle2
                      size={40}
                      style={{ color: "var(--brand-blue)" }}
                    />
                  </div>

                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    사원 등록 완료!
                  </h3>
                  <p className="text-gray-500 mb-8">
                    아래 사번을 꼭 기억해주세요. 서류발급 시 필요합니다.
                  </p>

                  {/* Employee Number Display */}
                  <div
                    className="relative inline-block px-10 py-6 rounded-2xl mb-8"
                    style={{ backgroundColor: "var(--brand-sky)" }}
                  >
                    <div className="text-xs font-semibold text-gray-400 mb-1">
                      발급된 사번
                    </div>
                    <div
                      className="text-4xl font-bold tracking-wider"
                      style={{ color: "var(--brand-blue)" }}
                    >
                      {regResult.employeeNo}
                    </div>
                    <button
                      onClick={() => copyToClipboard(regResult.employeeNo)}
                      className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                      title="복사"
                    >
                      <Copy
                        size={16}
                        style={{ color: "var(--brand-blue)" }}
                      />
                    </button>
                    {copied && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium">
                        복사됨!
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto">
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">이름</span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--brand-navy)" }}
                        >
                          {regResult.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">사번</span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--brand-blue)" }}
                        >
                          {regResult.employeeNo}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">등록일</span>
                        <span className="text-gray-600">
                          {new Date().toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      to="/docs"
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25"
                      style={{ backgroundColor: "var(--brand-blue)" }}
                    >
                      <FileText size={18} />
                      서류발급센터 이동
                    </Link>
                    <button
                      onClick={() => {
                        setRegResult(null);
                        setRegForm({});
                        setMode("select");
                      }}
                      className="px-8 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      처음으로 돌아가기
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Lookup Form ── */}
            {mode === "lookup" && !lookupResult && (
              <motion.div
                key="lookup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                  <button
                    onClick={() => {
                      setMode("select");
                      setLookupError("");
                    }}
                    className="flex items-center gap-1 text-sm font-medium mb-6 text-gray-400 hover:text-gray-600"
                  >
                    <ArrowRight size={16} className="rotate-180" />
                    뒤로 가기
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "var(--brand-sky)" }}
                    >
                      <Search
                        size={24}
                        style={{ color: "var(--brand-blue)" }}
                      />
                    </div>
                    <div>
                      <h2
                        className="text-xl font-bold"
                        style={{ color: "var(--brand-navy)" }}
                      >
                        사번 조회
                      </h2>
                      <p className="text-sm text-gray-400">
                        이름과 연락처로 사번을 확인하세요
                      </p>
                    </div>
                  </div>

                  {lookupError && (
                    <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 text-red-600 text-sm mb-5">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{lookupError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLookup} className="space-y-5">
                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5">
                        <User size={14} />
                        이름 *
                      </Label>
                      <Input
                        placeholder="홍길동"
                        required
                        value={lookupForm.name || ""}
                        onChange={(e) =>
                          setLookupForm({
                            ...lookupForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5">
                        <Phone size={14} />
                        연락처 *
                      </Label>
                      <Input
                        placeholder="010-0000-0000"
                        required
                        value={lookupForm.mobile || ""}
                        onChange={(e) =>
                          setLookupForm({
                            ...lookupForm,
                            mobile: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 mb-1.5">
                        <Calendar size={14} />
                        생년월일 (선택)
                      </Label>
                      <Input
                        type="date"
                        value={lookupForm.birthDate || ""}
                        onChange={(e) =>
                          setLookupForm({
                            ...lookupForm,
                            birthDate: e.target.value,
                          })
                        }
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: "var(--brand-blue)" }}
                    >
                      {lookupLoading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          사번 조회
                          <Search size={20} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      onClick={() => {
                        setMode("register");
                        setLookupError("");
                      }}
                      className="text-sm hover:underline"
                      style={{ color: "var(--brand-blue)" }}
                    >
                      아직 등록 전이신가요? 신규 등록하기
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Lookup Result ── */}
            {mode === "lookup" && lookupResult && (
              <motion.div
                key="lookup-result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: "var(--brand-sky)" }}
                  >
                    <CheckCircle2
                      size={40}
                      style={{ color: "var(--brand-blue)" }}
                    />
                  </div>

                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    사번 조회 완료
                  </h3>
                  <p className="text-gray-500 mb-8">
                    아래에서 사번을 확인하세요
                  </p>

                  <div
                    className="relative inline-block px-10 py-6 rounded-2xl mb-8"
                    style={{ backgroundColor: "var(--brand-sky)" }}
                  >
                    <div className="text-xs font-semibold text-gray-400 mb-1">
                      사번
                    </div>
                    <div
                      className="text-4xl font-bold tracking-wider"
                      style={{ color: "var(--brand-blue)" }}
                    >
                      {lookupResult.employeeNo}
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(lookupResult.employeeNo)
                      }
                      className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                      title="복사"
                    >
                      <Copy
                        size={16}
                        style={{ color: "var(--brand-blue)" }}
                      />
                    </button>
                    {copied && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium">
                        복사됨!
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto">
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">이름</span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--brand-navy)" }}
                        >
                          {lookupResult.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">부서</span>
                        <span className="text-gray-600">
                          {lookupResult.department || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">상태</span>
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            backgroundColor: "rgba(15,157,88,0.1)",
                            color: "#0f9d58",
                          }}
                        >
                          {STATUS_LABELS[lookupResult.status] ||
                            lookupResult.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      to="/docs"
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25"
                      style={{ backgroundColor: "var(--brand-blue)" }}
                    >
                      <FileText size={18} />
                      서류발급센터 이동
                    </Link>
                    <button
                      onClick={() => {
                        setLookupResult(null);
                        setLookupForm({});
                        setMode("select");
                      }}
                      className="px-8 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      처음으로 돌아가기
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Info Section */}
      <section
        className="py-16"
        style={{ backgroundColor: "var(--brand-gray-light)" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-7 border border-gray-100">
              <h3
                className="font-bold mb-4"
                style={{ color: "var(--brand-navy)" }}
              >
                사원 등록 안내
              </h3>
              <ul
                className="space-y-2.5 text-sm"
                style={{ color: "var(--brand-gray-dark)" }}
              >
                <li className="flex items-start gap-2">
                  <span
                    className="font-bold"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    1.
                  </span>
                  이름, 생년월일, 연락처를 입력하여 사원 등록을 합니다
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="font-bold"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    2.
                  </span>
                  등록 완료 후 사번(EMP-XXX)이 자동 발급됩니다
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="font-bold"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    3.
                  </span>
                  발급된 사번으로 서류발급센터에서 본인인증이 가능합니다
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="font-bold"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    4.
                  </span>
                  사번을 잊으셨다면 사번 조회 기능을 이용해주세요
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-100">
              <h3
                className="font-bold mb-4"
                style={{ color: "var(--brand-navy)" }}
              >
                자주 묻는 질문
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div
                    className="font-semibold mb-1"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    Q. 사번은 어떤 형식인가요?
                  </div>
                  <div style={{ color: "var(--brand-gray)" }}>
                    EMP-001, EMP-002와 같이 자동 순번으로 발급됩니다.
                  </div>
                </div>
                <div>
                  <div
                    className="font-semibold mb-1"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    Q. 중복 등록이 가능한가요?
                  </div>
                  <div style={{ color: "var(--brand-gray)" }}>
                    같은 이름과 연락처로는 중복 등록이 불가합니다. 기존 사번이
                    안내됩니다.
                  </div>
                </div>
                <div>
                  <div
                    className="font-semibold mb-1"
                    style={{ color: "var(--brand-navy)" }}
                  >
                    Q. 등록 후 바로 서류발급이 가능한가요?
                  </div>
                  <div style={{ color: "var(--brand-gray)" }}>
                    네, 사번 발급 즉시 서류발급센터에서 본인인증 후 서류를
                    발급받을 수 있습니다.
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