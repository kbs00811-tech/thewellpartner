/**
 * CompanyInfoContext
 * AdminSettings에서 관리하는 회사 정보를 전역으로 공급하는 Context Provider.
 * 공개 페이지(Footer, Contact, About, FloatingContact 등)에서 하드코딩 대신 사용.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import * as api from "../lib/api";

export interface CompanyInfo {
  company_name: string;
  ceo_name: string;
  business_no: string;
  phone: string;
  email: string;
  address: string;
  branch_address: string;
  branch_phone: string;
  branch_email: string;
  business_hours: string;
  founded_year: string;
  // Social links
  social_blog: string;
  social_instagram: string;
  social_youtube: string;
  social_facebook: string;
  social_kakao_channel: string;
  social_linkedin: string;
}

// 기본값 — API 미응답 시 폴백
const DEFAULTS: CompanyInfo = {
  company_name: "더웰파트너",
  ceo_name: "",
  business_no: "",
  phone: "",
  email: "",
  address: "",
  branch_address: "",
  branch_phone: "",
  branch_email: "",
  business_hours: "평일 09:00 ~ 18:00 (공휴일 제외)",
  founded_year: "",
  social_blog: "",
  social_instagram: "",
  social_youtube: "",
  social_facebook: "",
  social_kakao_channel: "",
  social_linkedin: "",
};

interface CompanyInfoContextValue {
  info: CompanyInfo;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanyInfoContext = createContext<CompanyInfoContextValue>({
  info: DEFAULTS,
  loading: true,
  refresh: async () => {},
});

export function CompanyInfoProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<CompanyInfo>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    try {
      const data = await api.publicApi.getCompanyInfo();
      setInfo((prev) => ({ ...prev, ...data }));
    } catch (e) {
      // 네트워크 오류 시 기본값 유지 — 조용히 실패
      console.warn("CompanyInfo fetch failed, using defaults:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return (
    <CompanyInfoContext.Provider value={{ info, loading, refresh: fetchInfo }}>
      {children}
    </CompanyInfoContext.Provider>
  );
}

/** 회사 정보 접근 훅 */
export function useCompanyInfo(): CompanyInfoContextValue {
  return useContext(CompanyInfoContext);
}

/**
 * 값이 비어있으면 fallback을 반환하는 헬퍼.
 * 예: display(info.phone, "031-XXX-XXXX")
 */
export function display(value: string | undefined | null, fallback: string): string {
  return value && value.trim() ? value : fallback;
}