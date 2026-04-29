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
    // GA4 SPA 페이지뷰 추적 (어드민 제외)
    if (!pathname.startsWith("/manage-twp") && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "page_view", {
        page_path: pathname + search,
        page_title: document.title,
      });
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
