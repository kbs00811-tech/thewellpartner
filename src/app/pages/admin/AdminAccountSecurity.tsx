/**
 * 내 계정 보안 — 비밀번호 변경 + Google OTP(2단계 인증) 등록/해제
 * 사이드바 전용 메뉴. 로그인한 본인 계정 대상.
 */
import AccountSecurityCard from "./AccountSecurityCard";

export default function AdminAccountSecurity() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🔐 내 계정 보안</h1>
        <p className="text-sm text-slate-600 mt-1">
          비밀번호 변경과 <strong>Google OTP(2단계 인증)</strong> 등록·해제를 관리합니다.
          OTP를 등록하면 다음 로그인부터 인증 앱의 6자리 코드가 필요합니다.
        </p>
      </div>
      <AccountSecurityCard />
    </div>
  );
}
