import { Outlet, useLocation } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FloatingContact } from "../components/FloatingContact";
import { BackToTop } from "../components/BackToTop";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { CompanyInfoProvider } from "../components/CompanyInfoContext";
import { PageSkeleton } from "../components/PageSkeleton";
import { Toaster } from "../components/ui/sonner";
import { useEffect, Suspense } from "react";

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const isAdmin = pathname.startsWith("/manage-twp");
    if (isAdmin) return;

    // GA4 SPA 페이지뷰 추적
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "page_view", {
        page_path: pathname + search,
        page_title: document.title,
      });
    }

    // 네이버 애널리틱스 SPA 페이지뷰 추적
    // wcs_do() 호출 전 wcs_add["wa"] 재설정 (라우팅 후 컨텍스트 유지)
    const w = window as any;
    if (w.wcs && typeof w.wcs_do === "function") {
      try {
        if (!w.wcs_add) w.wcs_add = {};
        w.wcs_add["wa"] = "2def2b9d547962";
        w.wcs_do();
      } catch (e) {
        // 외부 스크립트 로드 실패는 무시 (앱 동작에 영향 없게)
      }
    }
  }, [pathname, search]);
  return null;
}

export default function Root() {
  return (
    <CompanyInfoProvider>
      <div className="min-h-screen flex flex-col">
        <ScrollToTop />
        <Header />
        <main className="flex-1" id="main-content">
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
        <FloatingContact />
        <BackToTop />
        <Toaster position="top-right" richColors closeButton />
      </div>
    </CompanyInfoProvider>
  );
}
