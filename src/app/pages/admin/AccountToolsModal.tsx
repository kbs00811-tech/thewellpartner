/**
 * 로그인 화면용 계정 도구 — Google OTP 등록 / 아이디·비밀번호 변경
 * 본인 인증(아이디+비밀번호, OTP 사용 시 코드)을 거친 뒤 동작.
 */
import { useState } from "react";
import QRCode from "qrcode";
import { X, Loader2, ShieldCheck, KeyRound, User, Lock, Copy, Check, ArrowRight } from "lucide-react";
import * as api from "../../lib/api";
import { handleError } from "../../lib/error-handler";
import { validatePasswordStrength } from "../../lib/security";

type Mode = "otp" | "cred";

export default function AccountToolsModal({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const [step, setStep] = useState<"auth" | "work" | "done">("auth");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  // OTP 등록용
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [copied, setCopied] = useState(false);

  // 자격증명 변경용
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const title = mode === "otp" ? "Google OTP(2단계 인증) 등록" : "아이디 / 비밀번호 변경";

  const startOtpSetup = async () => {
    const r = await api.otpSetup();
    setSecret(r.secret);
    setQr(await QRCode.toDataURL(r.otpauthUri, { width: 190, margin: 1 }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) { setError("아이디와 비밀번호를 입력하세요."); return; }
    setLoading(true);
    try {
      if (needOtp) {
        // 이미 OTP 사용 중 → 코드로 로그인 (cred 변경 시)
        await api.verifyOtpLogin(pendingToken, otpCode);
      } else {
        const data = await api.login(username.trim(), password);
        if (data?.otpRequired) {
          if (mode === "otp") {
            setError("이미 2단계 인증이 등록되어 있습니다. 해제는 로그인 후 설정 > 보안에서 가능합니다.");
            setLoading(false);
            return;
          }
          // cred 모드: OTP 코드 입력 단계로
          setPendingToken(data.pendingToken);
          setNeedOtp(true);
          setLoading(false);
          return;
        }
      }
      // 인증 완료 → 작업 단계
      if (mode === "otp") await startOtpSetup();
      setStep("work");
    } catch (err: any) {
      setError(err.message || "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableOtp = async () => {
    setError("");
    if (!/^\d{6}$/.test(enableCode.trim())) { setError("6자리 인증 코드를 입력하세요."); return; }
    setLoading(true);
    try {
      await api.otpEnable(enableCode);
      api.logout(); // 등록 후 재로그인 시 OTP 요구
      setDoneMsg("2단계 인증이 등록되었습니다. 다음 로그인부터 인증 앱 코드가 필요합니다.");
      setStep("done");
    } catch (err: any) { setError(err.message || "활성화에 실패했습니다."); }
    finally { setLoading(false); }
  };

  const handleChangeCred = async () => {
    setError("");
    if (!newUsername.trim() && !newPassword) { setError("새 아이디 또는 새 비밀번호 중 하나는 입력해야 합니다."); return; }
    if (newPassword) {
      const chk = validatePasswordStrength(newPassword);
      if (!chk.valid) { setError("새 비밀번호: " + chk.errors.join(", ")); return; }
      if (newPassword !== confirmPassword) { setError("새 비밀번호 확인이 일치하지 않습니다."); return; }
    }
    setLoading(true);
    try {
      await api.changeCredentials(password, newUsername.trim() || undefined, newPassword || undefined);
      api.logout();
      setDoneMsg("계정 정보가 변경되었습니다. 새 정보로 다시 로그인해주세요.");
      setStep("done");
    } catch (err: any) { setError(err.message || "변경에 실패했습니다."); }
    finally { setLoading(false); }
  };

  const copySecret = async () => {
    try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
  };

  const inputCls = "w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-base" style={{ color: "var(--brand-navy)" }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}

          {step === "auth" && (
            <form onSubmit={handleAuth} className="space-y-3">
              <p className="text-sm text-gray-500">본인 확인을 위해 현재 아이디와 비밀번호를 입력하세요.</p>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className={inputCls} placeholder="아이디" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" disabled={needOtp} />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="password" className={inputCls} placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={needOtp} />
              </div>
              {needOtp && (
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input className={inputCls + " text-center tracking-widest font-mono"} inputMode="numeric" maxLength={6}
                    placeholder="인증 앱 6자리 코드" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} autoFocus />
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-blue)" }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>다음<ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {step === "work" && mode === "otp" && (
            <div className="space-y-4">
              <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                <li>인증 앱(Google Authenticator/Authy)을 설치하세요.</li>
                <li>아래 QR을 스캔하거나 키를 수동 입력하세요.</li>
                <li>앱의 6자리 코드를 입력해 등록을 완료하세요.</li>
              </ol>
              <div className="flex flex-col items-center gap-3">
                {qr && <img src={qr} alt="OTP QR" className="w-44 h-44 border border-gray-100 rounded-xl" />}
                <div className="w-full">
                  <div className="text-xs font-semibold text-gray-400 mb-1">수동 입력 키</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-gray-50 text-xs font-mono break-all">{secret}</code>
                    <button onClick={copySecret} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                      {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-gray-500" />}
                    </button>
                  </div>
                </div>
                <div className="relative w-full">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input className={inputCls + " text-center tracking-widest font-mono"} inputMode="numeric" maxLength={6}
                    placeholder="000000" value={enableCode} onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, ""))} />
                </div>
                <button onClick={handleEnableOtp} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "#10b981" }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} />등록 완료</>}
                </button>
              </div>
            </div>
          )}

          {step === "work" && mode === "cred" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">변경할 항목만 입력하세요 (둘 다 가능).</p>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input className={inputCls} placeholder="새 아이디 (변경 시)" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} autoComplete="off" />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="password" className={inputCls} placeholder="새 비밀번호 (8자+영문+숫자)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="password" className={inputCls} placeholder="새 비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <button onClick={handleChangeCred} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-blue)" }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>변경하기</>}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                <Check size={24} className="text-emerald-600" />
              </div>
              <p className="text-sm text-gray-700">{doneMsg}</p>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: "var(--brand-blue)" }}>
                로그인으로
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
