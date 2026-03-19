/**
 * 인증 상태 관리 Hook
 * - 세션 만료 체크 (24시간)
 * - 자동 로그아웃
 * - graceful 세션 만료 처리
 */
import { useEffect, useCallback, useRef, useState } from "react";
import * as api from "../lib/api";
import { isTokenExpired } from "../lib/security";

const SESSION_CHECK_INTERVAL = 60_000; // 1분마다 체크 (5분 → 1분으로 단축)
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24시간

interface UseAuthReturn {
  user: any;
  isAuthenticated: boolean;
  isSessionExpiring: boolean; // 만료 10분 전 경고
  handleLogout: () => void;
  refreshCheck: () => boolean;
}

export function useAuth(options?: { onExpired?: () => void }): UseAuthReturn {
  const [user, setUser] = useState<any>(api.getUser());
  const [isSessionExpiring, setIsSessionExpiring] = useState(false);
  const expiredCallbackRef = useRef(options?.onExpired);
  expiredCallbackRef.current = options?.onExpired;

  const checkSession = useCallback((): boolean => {
    const token = api.getToken();
    if (!token) return false;

    if (isTokenExpired(token, SESSION_MAX_AGE)) {
      api.logout();
      expiredCallbackRef.current?.();
      return false;
    }

    // 만료 10분 전 경고
    const parts = token.split("-");
    const ts = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(ts)) {
      const remaining = SESSION_MAX_AGE - (Date.now() - ts);
      setIsSessionExpiring(remaining < 10 * 60 * 1000);
    }

    return true;
  }, []);

  useEffect(() => {
    // 초기 체크
    if (!api.isLoggedIn()) {
      expiredCallbackRef.current?.();
      return;
    }

    setUser(api.getUser());
    const interval = setInterval(() => {
      if (!checkSession()) {
        clearInterval(interval);
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkSession]);

  const handleLogout = useCallback(() => {
    const currentUser = api.getUser();
    api.auditLogs.log("로그아웃", `${currentUser?.name || "관리자"} 로그아웃`).catch(() => {});
    api.logout();
    window.location.href = "/admin/login";
  }, []);

  return {
    user,
    isAuthenticated: api.isLoggedIn(),
    isSessionExpiring,
    handleLogout,
    refreshCheck: checkSession,
  };
}
