import { createBrowserRouter } from "react-router";
import { lazy } from "react";
import Root from "./pages/Root";
import Home from "./pages/Home";

import { ADMIN_BASE } from "./constants";

// Public pages — lazy loaded
const About = lazy(() => import("./pages/About"));
const Business = lazy(() => import("./pages/Business"));
const Service = lazy(() => import("./pages/Service"));
const Recruit = lazy(() => import("./pages/Recruit"));
const Customer = lazy(() => import("./pages/Customer"));
const Contact = lazy(() => import("./pages/Contact"));
const DocCenter = lazy(() => import("./pages/DocCenter"));
const EmployeeRegister = lazy(() => import("./pages/EmployeeRegister"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages — lazy loaded
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRecruit = lazy(() => import("./pages/admin/AdminRecruit"));
const AdminApplicants = lazy(() => import("./pages/admin/AdminApplicants"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminEmployees = lazy(() => import("./pages/admin/AdminEmployees"));
const AdminDocuments = lazy(() => import("./pages/admin/AdminDocuments"));
const AdminStatistics = lazy(() => import("./pages/admin/AdminStatistics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminErp = lazy(() => import("./pages/admin/AdminErp"));
const AdminWebsite = lazy(() => import("./pages/admin/AdminWebsite"));
const AdminForeign = lazy(() => import("./pages/admin/AdminForeign"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPermissions = lazy(() => import("./pages/admin/AdminPermissions"));
const AdminAccessLogs = lazy(() => import("./pages/admin/AdminAccessLogs"));
const AdminTalentPool = lazy(() => import("./pages/admin/AdminTalentPool"));
const AdminRecruitStats = lazy(() => import("./pages/admin/AdminRecruitStats"));
const AdminPayroll = lazy(() => import("./pages/admin/AdminPayroll"));
const AdminSettlement = lazy(() => import("./pages/admin/AdminSettlement"));
const AdminContractDocs = lazy(() => import("./pages/admin/AdminContractDocs"));
const AdminBillingImport = lazy(() => import("./pages/admin/AdminBillingImport"));
const AdminAttendanceImport = lazy(() => import("./pages/admin/AdminAttendanceImport"));
const AdminDataCleanup = lazy(() => import("./pages/admin/AdminDataCleanup"));
const AdminPayslipBatch = lazy(() => import("./pages/admin/AdminPayslipBatch"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "about", Component: About },
      { path: "business", Component: Business },
      { path: "service", Component: Service },
      { path: "recruit", Component: Recruit },
      { path: "customer", Component: Customer },
      { path: "contact", Component: Contact },
      { path: "docs", Component: DocCenter },
      { path: "register", Component: EmployeeRegister },
      { path: "privacy", Component: Privacy },
      { path: "terms", Component: Terms },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: `${ADMIN_BASE}/login`,
    Component: AdminLogin,
  },
  {
    path: ADMIN_BASE,
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "recruit", Component: AdminRecruit },
      { path: "applicants", Component: AdminApplicants },
      { path: "inquiries", Component: AdminInquiries },
      { path: "employees", Component: AdminEmployees },
      { path: "documents", Component: AdminDocuments },
      { path: "documents/logs", Component: AdminDocuments },
      { path: "documents/payslips", Component: AdminDocuments },
      { path: "documents/templates", Component: AdminDocuments },
      { path: "statistics", Component: AdminStatistics },
      { path: "settings", Component: AdminSettings },
      { path: "erp", Component: AdminErp },
      { path: "erp/clients", Component: AdminErp },
      { path: "erp/sites", Component: AdminErp },
      { path: "erp/placements", Component: AdminErp },
      { path: "erp/attendance", Component: AdminErp },
      { path: "erp/foreign", Component: AdminForeign },
      { path: "erp/foreign/visa", Component: AdminForeign },
      { path: "erp/foreign/stay", Component: AdminForeign },
      { path: "website/banners", Component: AdminWebsite },
      { path: "website/about", Component: AdminWebsite },
      { path: "website/business", Component: AdminWebsite },
      { path: "website/notices", Component: AdminWebsite },
      { path: "website/faq", Component: AdminWebsite },
      { path: "website/materials", Component: AdminWebsite },
      { path: "talent-pool", Component: AdminTalentPool },
      { path: "recruit/stats", Component: AdminRecruitStats },
      { path: "users", Component: AdminUsers },
      { path: "permissions", Component: AdminPermissions },
      { path: "access-logs", Component: AdminAccessLogs },
      { path: "payroll", Component: AdminPayroll },
      { path: "settlement", Component: AdminSettlement },
      { path: "contract-docs", Component: AdminContractDocs },
      { path: "billing-import", Component: AdminBillingImport },
      { path: "attendance-import", Component: AdminAttendanceImport },
      { path: "data-cleanup", Component: AdminDataCleanup },
      { path: "payslip-batch", Component: AdminPayslipBatch },
    ],
  },
]);
