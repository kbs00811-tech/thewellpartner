import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Lock, User, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import * as api from "../../lib/api";
import { Logo } from "../../components/Logo";
import { Toaster } from "../../components/ui/sonner";
import { checkRateLimit, resetRateLimit } from "../../lib/security";
import { handleSuccess } from "../../lib/error-handler";

const RATE_LIMIT_KEY = "admin_login";

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState("");
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const navigate = useNavigate();

  // 잠금 카운트다운
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1000) { clearInterval(timer); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Rate Limit 체크
    const rl = checkRateLimit(RATE_LIMIT_KEY, {
      maxAttempts: 5,
      windowMs: 60_000,
      lockoutMs: 300_000,
    });
    if (!rl.allowed) {
      setLockoutRemaining(rl.lockoutRemainingMs);
      setError(`로그인 시도가 너무 많습니다. ${Math.ceil(rl.lockoutRemainingMs / 1000)}초 후 다시 시도해주세요.`);
      return;
    }

    setLoading(true);
    try {
      await api.login(username.trim(), password);
      resetRateLimit(RATE_LIMIT_KEY);
      navigate("/manage-twp");
    } catch (err: any) {
      if (err.message?.includes("아이디") || err.message?.includes("비밀번호")) {
        try {
          setSeedStatus("시드 데이터 초기화 중...");
          await api.seed();
          setSeedStatus("시드 완료. 로그인 재시도...");
          await api.login(username.trim(), password);
          resetRateLimit(RATE_LIMIT_KEY);
          navigate("/manage-twp");
          return;
        } catch {
          setSeedStatus("");
        }
      }
      const remaining = rl.remainingAttempts;
      const msg = err.message || "로그인에 실패했습니다.";
      setError(remaining > 0 ? `${msg} (남은 시도: ${remaining}회)` : msg);
    } finally {
      setLoading(false);
      setSeedStatus("");
    }
  };

  const handleSeedManual = async () => {
    setError("");
    setLoading(true);
    setSeedStatus("시드 데이터 강제 초기화 중...");
    try {
      await api.seed();
      setSeedStatus("");
      setError("");
      handleSuccess("시드 데이터가 초기화되었습니다. admin / admin1234 로 로그인하세요.");
    } catch (err: any) {
      setError(`시드 오류: ${err.message}`);
    } finally {
      setLoading(false);
      setSeedStatus("");
    }
  };

  const isLocked = lockoutRemaining > 0;
  const lockoutSeconds = Math.ceil(lockoutRemaining / 1000);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f0f4f8" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center mb-4">
            <Logo variant="light" size="lg" />
            <div className="text-[9px] text-gray-400 tracking-widest uppercase mt-2">
              ADMIN SYSTEM
            </div>
          </div>
          <p className="text-sm text-gray-400">관리자 시스템에 로그인하세요</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium flex items-start gap-2">
                <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {seedStatus && (
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> {seedStatus}
              </div>
            )}
            {isLocked && (
              <div className="p-3 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium flex items-center gap-2">
                <Lock size={14} />
                <span>계정 잠금 중: {lockoutSeconds}초 남음</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--brand-navy)" }}>아이디</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)] transition-all"
                  placeholder="관리자 아이디"
                  autoComplete="username"
                  disabled={isLocked}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--brand-navy)" }}>비밀번호</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)] transition-all"
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  disabled={isLocked}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>로그인<ArrowRight size={18} /></>}
            </button>
          </form>
          <div className="mt-4 p-3 rounded-xl bg-gray-50 text-xs text-gray-400">
            <div className="font-semibold text-gray-500 mb-1">데모 환경</div>
            <div className="mb-2">초기 계정: <span className="font-mono text-gray-600">admin</span> / <span className="font-mono text-gray-600">admin1234</span></div>
            <button
              type="button"
              onClick={handleSeedManual}
              disabled={loading}
              className="text-blue-500 hover:text-blue-700 font-medium underline underline-offset-2 disabled:opacity-50"
            >
              시드 데이터 강제 초기화
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">&copy; 2025 더웰파트너. Admin System v1.0</p>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
