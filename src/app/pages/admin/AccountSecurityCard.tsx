/**
 * 내 계정 보안 — 비밀번호 변경 + 2단계 인증(OTP/TOTP)
 * AdminSettings 보안 탭에 삽입.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Lock, ShieldCheck, ShieldOff, Loader2, KeyRound, Copy, Check } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { validatePasswordStrength } from "../../lib/security";

function Card({ children, icon: Icon, iconBg, iconColor, title, desc }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: "var(--brand-navy)" }}>{title}</div>
          <div className="text-xs text-gray-400">{desc}</div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PwInput({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)] transition-all"
      />
    </div>
  );
}

export default function AccountSecurityCard() {
  // 비밀번호 변경
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // OTP
  const [otpEnabled, setOtpEnabled] = useState<boolean | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [disablePw, setDisablePw] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.otpStatus().then((r) => setOtpEnabled(!!r.otp_enabled)).catch(() => setOtpEnabled(false));
  }, []);

  const handleChangePw = async () => {
    const check = validatePasswordStrength(newPw);
    if (!check.valid) { handleError(new Error("새 비밀번호: " + check.errors.join(", "))); return; }
    if (newPw !== confirmPw) { handleError(new Error("새 비밀번호 확인이 일치하지 않습니다.")); return; }
    if (curPw === newPw) { handleError(new Error("현재 비밀번호와 다른 비밀번호를 사용하세요.")); return; }
    setPwSaving(true);
    try {
      await api.changePassword(curPw, newPw);
      handleSuccess("비밀번호가 변경되었습니다.");
      setCurPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) { handleError(e); } finally { setPwSaving(false); }
  };

  const startSetup = async () => {
    setOtpLoading(true);
    try {
      const r = await api.otpSetup();
      setSecret(r.secret);
      setQrDataUrl(await QRCode.toDataURL(r.otpauthUri, { width: 200, margin: 1 }));
      setSetupMode(true);
    } catch (e) { handleError(e); } finally { setOtpLoading(false); }
  };

  const confirmEnable = async () => {
    if (!/^\d{6}$/.test(enableCode.trim())) { handleError(new Error("6자리 코드를 입력하세요.")); return; }
    setOtpLoading(true);
    try {
      await api.otpEnable(enableCode);
      handleSuccess("2단계 인증이 활성화되었습니다.");
      setOtpEnabled(true); setSetupMode(false); setSecret(""); setQrDataUrl(""); setEnableCode("");
    } catch (e) { handleError(e); } finally { setOtpLoading(false); }
  };

  const disable = async () => {
    if (!disablePw) { handleError(new Error("현재 비밀번호를 입력하세요.")); return; }
    setOtpLoading(true);
    try {
      await api.otpDisable(disablePw);
      handleSuccess("2단계 인증이 해제되었습니다.");
      setOtpEnabled(false); setDisablePw("");
    } catch (e) { handleError(e); } finally { setOtpLoading(false); }
  };

  const copySecret = async () => {
    try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <>
      {/* 비밀번호 변경 */}
      <Card icon={Lock} iconBg="rgba(37,99,235,0.1)" iconColor="var(--brand-blue)" title="비밀번호 변경" desc="본인 계정 비밀번호를 변경합니다">
        <div className="grid md:grid-cols-3 gap-4">
          <PwInput label="현재 비밀번호" value={curPw} onChange={setCurPw} placeholder="현재 비밀번호" />
          <PwInput label="새 비밀번호" value={newPw} onChange={setNewPw} placeholder="8자 이상, 영문+숫자" />
          <PwInput label="새 비밀번호 확인" value={confirmPw} onChange={setConfirmPw} placeholder="다시 입력" />
        </div>
        <div className="mt-2 text-xs text-gray-400">8자 이상, 영문자와 숫자를 포함해야 합니다.</div>
        <button
          onClick={handleChangePw}
          disabled={pwSaving || !curPw || !newPw || !confirmPw}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          비밀번호 변경
        </button>
      </Card>

      {/* 2단계 인증 */}
      <Card
        icon={otpEnabled ? ShieldCheck : ShieldOff}
        iconBg={otpEnabled ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.15)"}
        iconColor={otpEnabled ? "#10b981" : "#64748b"}
        title="2단계 인증 (OTP)"
        desc="Google Authenticator 등 인증 앱으로 로그인 보안을 강화합니다"
      >
        {otpEnabled === null ? (
          <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> 상태 확인 중...</div>
        ) : otpEnabled ? (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <ShieldCheck size={14} /> 활성화됨
            </div>
            <p className="text-sm text-gray-600">로그인 시 인증 앱의 6자리 코드가 필요합니다. 해제하려면 현재 비밀번호를 입력하세요.</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 max-w-xs">
                <PwInput label="현재 비밀번호" value={disablePw} onChange={setDisablePw} placeholder="해제 확인용" />
              </div>
              <button
                onClick={disable}
                disabled={otpLoading || !disablePw}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50"
              >
                {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
                2단계 인증 해제
              </button>
            </div>
          </div>
        ) : setupMode ? (
          <div className="space-y-4">
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>인증 앱(Google Authenticator, Authy 등)을 설치하세요.</li>
              <li>아래 QR을 스캔하거나 키를 수동 입력하세요.</li>
              <li>앱에 표시된 6자리 코드를 입력해 활성화하세요.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {qrDataUrl && <img src={qrDataUrl} alt="OTP QR" className="w-44 h-44 border border-gray-100 rounded-xl" />}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1">수동 입력 키</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-gray-50 text-xs font-mono break-all">{secret}</code>
                    <button onClick={copySecret} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="복사">
                      {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-gray-500" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">인증 코드 (6자리)</label>
                  <div className="relative max-w-[200px]">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="text" inputMode="numeric" maxLength={6} value={enableCode}
                      onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-center text-lg tracking-widest font-mono focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-sky)]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={confirmEnable} disabled={otpLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:shadow-lg disabled:opacity-50" style={{ backgroundColor: "var(--brand-blue)" }}>
                    {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    활성화
                  </button>
                  <button onClick={() => { setSetupMode(false); setSecret(""); setQrDataUrl(""); setEnableCode(""); }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">현재 비활성화 상태입니다. 활성화하면 로그인 시 비밀번호 + 인증앱 코드가 필요해 보안이 크게 강화됩니다.</p>
            <button onClick={startSetup} disabled={otpLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:shadow-lg disabled:opacity-50" style={{ backgroundColor: "#10b981" }}>
              {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              2단계 인증 설정 시작
            </button>
          </div>
        )}
      </Card>
    </>
  );
}
