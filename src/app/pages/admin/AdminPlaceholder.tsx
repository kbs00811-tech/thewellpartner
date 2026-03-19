import { useLocation } from "react-router";
import { Construction } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/admin/website/banners": "메인 배너 관리",
  "/admin/website/about": "회사소개 관리",
  "/admin/website/business": "사업분야 관리",
  "/admin/website/notices": "공지사항 관리",
  "/admin/website/faq": "FAQ 관리",
  "/admin/talent-pool": "인재풀 관리",
  "/admin/recruit/stats": "채용 통계",
  "/admin/documents/payslips": "급여명세서 관리",
  "/admin/documents/templates": "서류 템플릿 관리",
  "/admin/documents/logs": "발급 로그",
  "/admin/users": "관리자 계정 관리",
  "/admin/permissions": "권한 그룹 관리",
  "/admin/access-logs": "접속 로그",
};

export default function AdminPlaceholder() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "페이지";

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "var(--brand-sky)" }}>
        <Construction size={28} style={{ color: "var(--brand-blue)" }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--brand-navy)" }}>
        {title}
      </h2>
      <p className="text-sm text-gray-400 max-w-md">
        이 페이지는 현재 개발 중입니다. 곧 완성될 예정입니다.
      </p>
    </div>
  );
}
