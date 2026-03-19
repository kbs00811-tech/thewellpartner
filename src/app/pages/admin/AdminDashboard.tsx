import { Link } from "react-router";
import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare, Users, Briefcase, FileText,
  ArrowRight, ClipboardList, Mail,
  UserPlus, Upload, Megaphone, Clock, Loader2,
  Building2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from "recharts";
import * as api from "../../lib/api";
import { handleError } from "../../lib/error-handler";
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS, INQUIRY_STATUS_COLORS } from "../../constants";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "접수", CHECKING: "확인중", COUNSELED: "상담완료", HOLD: "보류", CLOSED: "종료",
  APPLIED: "신규접수", CONTACTED: "연락완료", INTERVIEW: "면접예정", PASSED: "합격", FAILED: "불합격",
  SUCCESS: "성공", FAILED_DOC: "실패",
};
const statusColors: Record<string, { bg: string; text: string }> = {
  RECEIVED: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  CHECKING: { bg: "rgba(30,86,160,0.1)", text: "#1e56a0" },
  COUNSELED: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  HOLD: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  CLOSED: { bg: "rgba(139,149,165,0.1)", text: "#8b95a5" },
  APPLIED: { bg: "rgba(42,125,225,0.1)", text: "#2a7de1" },
  CONTACTED: { bg: "rgba(30,86,160,0.1)", text: "#1e56a0" },
  INTERVIEW: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  PASSED: { bg: "rgba(15,157,88,0.1)", text: "#0f9d58" },
  FAILED: { bg: "rgba(230,57,70,0.1)", text: "#e63946" },
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status;
  const style = statusColors[status] || { bg: "#f0f4f8", text: "#4a5568" };
  return (
    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: style.bg, color: style.text }}>
      {label}
    </span>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashboard, emps, jobPosts] = await Promise.all([
        api.getDashboard(),
        api.employees.list().catch(() => []),
        api.jobPosts.list().catch(() => []),
      ]);
      setData(dashboard);
      setEmployees(Array.isArray(emps) ? emps : []);
      setJobs(Array.isArray(jobPosts) ? jobPosts : []);
    } catch (e) {
      handleError(e, { fallback: "대시보드 데이터를 불러오는 데 실패했습니다." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} />
        <span className="ml-3 text-gray-500">데이터를 불러오는 중...</span>
      </div>
    );
  }

  const kpi = data?.kpi || { todayInquiries: 0, todayApplicants: 0, openJobs: 0, monthDocs: 0 };
  const recentInquiries = data?.recentInquiries || [];
  const recentApps = data?.recentApplications || [];
  const recentDocs = data?.recentDocs || [];

  // Compute monthly inquiry chart from real data
  const allInquiries = data?.allInquiries || recentInquiries;
  const monthlyInquiryData = (() => {
    const now = new Date();
    const months: { month: string; 기업문의: number; 구직문의: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}월`;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let company = 0;
      let seeker = 0;
      allInquiries.forEach((inq: any) => {
        const created = (inq.created_at || "").slice(0, 7);
        if (created === yearMonth) {
          if (inq.inquiry_type === "COMPANY") company++;
          else seeker++;
        }
      });
      months.push({ month: label, 기업문의: company, 구직문의: seeker });
    }
    return months;
  })();

  // 문의 상태별 분포 데이터 (inquiryStatusData 버그 수정)
  const inquiryStatusCounts: Record<string, number> = {};
  allInquiries.forEach((inq: any) => {
    inquiryStatusCounts[inq.status || "RECEIVED"] = (inquiryStatusCounts[inq.status || "RECEIVED"] || 0) + 1;
  });
  const inquiryStatusColors: Record<string, string> = {
    RECEIVED: "#2a7de1", CHECKING: "#1e56a0", COUNSELED: "#0f9d58", HOLD: "#8b5cf6", CLOSED: "#8b95a5",
  };
  const inquiryStatusData = Object.entries(inquiryStatusCounts).map(([name, value]) => ({
    name: INQUIRY_STATUS_LABELS[name] || STATUS_LABELS[name] || name,
    value,
    color: inquiryStatusColors[name] || "#8b95a5",
  }));

  const kpiCards = [
    { label: "오늘 신규 문의", value: String(kpi.todayInquiries), icon: MessageSquare, color: "#1e56a0", bg: "#e8f0fe", link: "/admin/inquiries" },
    { label: "오늘 신규 지원자", value: String(kpi.todayApplicants), icon: Users, color: "#2a7de1", bg: "rgba(42,125,225,0.1)", link: "/admin/applicants" },
    { label: "진행 중 채용공고", value: String(kpi.openJobs), icon: Briefcase, color: "#0f9d58", bg: "rgba(15,157,88,0.1)", link: "/admin/recruit" },
    { label: "이번달 서류발급", value: String(kpi.monthDocs), icon: FileText, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", link: "/admin/documents/logs" },
    { label: "총 직원 수", value: String(employees.filter(e => e.employment_status === "ACTIVE").length), icon: UserPlus, color: "#e63946", bg: "rgba(230,57,70,0.1)", link: "/admin/employees" },
    { label: "총 채용공고", value: String(jobs.length), icon: Building2, color: "#0f766e", bg: "rgba(15,118,110,0.1)", link: "/admin/recruit" },
  ];

  // 직원 부서별 분포
  const deptCounts: Record<string, number> = {};
  employees.filter(e => e.employment_status === "ACTIVE").forEach((e) => {
    const dept = e.department_name || "미배정";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptColors = ["#1e56a0", "#2a7de1", "#0f9d58", "#8b5cf6", "#e63946", "#0f766e", "#d97706", "#6366f1"];
  const deptData = Object.entries(deptCounts).map(([name, value], i) => ({
    name, value, color: deptColors[i % deptColors.length],
  }));

  // 채용공고 상태별 분포
  const jobStatusCounts: Record<string, number> = {};
  jobs.forEach((j) => { jobStatusCounts[j.status || "DRAFT"] = (jobStatusCounts[j.status || "DRAFT"] || 0) + 1; });
  const jobStatusColors: Record<string, string> = { OPEN: "#0f9d58", CLOSED: "#8b95a5", DRAFT: "#2a7de1", HIDDEN: "#4a5568" };
  const JOB_STATUS_LABELS: Record<string, string> = { OPEN: "모집중", CLOSED: "마감", DRAFT: "보류", HIDDEN: "숨김" };
  const jobStatusData = Object.entries(jobStatusCounts).map(([name, value]) => ({
    name: JOB_STATUS_LABELS[name] || name, value, color: jobStatusColors[name] || "#8b95a5",
  }));

  // 월별 입사자 추이 (최근 6개월)
  const monthlyHires = (() => {
    const now = new Date();
    const months: { month: string; 입사: number; 퇴직: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}월`;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let hired = 0, resigned = 0;
      employees.forEach((e) => {
        if ((e.hire_date || "").startsWith(yearMonth)) hired++;
        if ((e.resign_date || "").startsWith(yearMonth)) resigned++;
      });
      months.push({ month: label, 입사: hired, 퇴직: resigned });
    }
    return months;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>대시보드</h1>
          <p className="text-sm text-gray-400 mt-1">더웰파트너 관리자 현황 요약</p>
        </div>
        <div className="text-sm text-gray-400">
          <Clock size={14} className="inline mr-1" />
          {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <Link key={i} to={card.link} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:shadow-blue-900/5 hover:border-transparent transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: "var(--brand-navy)" }}>{card.value}</div>
            <div className="text-[11px] text-gray-400">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>빠른 바로가기</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "채용공고 등록", icon: ClipboardList, path: "/admin/recruit", color: "#1e56a0" },
            { name: "문의 확인", icon: Mail, path: "/admin/inquiries", color: "#2a7de1" },
            { name: "직원 등록", icon: UserPlus, path: "/admin/employees", color: "#0f9d58" },
            { name: "급여명세서 업로드", icon: Upload, path: "/admin/documents/payslips", color: "#8b5cf6" },
            { name: "공지사항 등록", icon: Megaphone, path: "/admin/website/notices", color: "#e63946" },
          ].map((action, i) => (
            <Link key={i} to={action.path} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-100 text-sm font-medium hover:shadow-md hover:border-transparent transition-all" style={{ color: action.color }}>
              <action.icon size={16} />{action.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>월별 문의 추이</h3>
            <Link to="/admin/statistics" className="text-xs text-gray-400 hover:text-[var(--brand-blue)] transition-colors flex items-center gap-1">상세보기 <ArrowRight size={12} /></Link>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyInquiryData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b95a5" }} />
              <YAxis tick={{ fontSize: 12, fill: "#8b95a5" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <Bar dataKey="기업문의" fill="#1e56a0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="구직문의" fill="#2a7de1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>문의 처리 현황</h3>
          {inquiryStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={inquiryStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {inquiryStatusData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {inquiryStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-500">{item.name}</span>
                    <span className="font-semibold ml-auto" style={{ color: "var(--brand-navy)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-10 text-sm">데이터 없음</div>
          )}
        </div>
      </div>

      {/* Additional Charts Row (P3) */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* 월별 입사/퇴직 추이 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>월별 입사/퇴직 추이</h3>
            <Link to="/admin/employees" className="text-xs text-gray-400 hover:text-[var(--brand-blue)] transition-colors flex items-center gap-1">직원관리 <ArrowRight size={12} /></Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyHires}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b95a5" }} />
              <YAxis tick={{ fontSize: 12, fill: "#8b95a5" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="입사" fill="rgba(15,157,88,0.15)" stroke="#0f9d58" strokeWidth={2} />
              <Area type="monotone" dataKey="퇴직" fill="rgba(230,57,70,0.15)" stroke="#e63946" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 부서별 직원 분포 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>부서별 직원 분포</h3>
          {deptData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {deptData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {deptData.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-500 truncate">{item.name}</span>
                    <span className="font-semibold ml-auto" style={{ color: "var(--brand-navy)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-10 text-sm">데이터 없음</div>
          )}
        </div>
      </div>

      {/* Recruit + Job Status Chart */}
      {jobStatusData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>채용공고 현황</h3>
            <Link to="/admin/recruit" className="text-xs text-gray-400 hover:text-[var(--brand-blue)] transition-colors flex items-center gap-1">채용관리 <ArrowRight size={12} /></Link>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            {jobStatusData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                  <span className="text-base font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Inquiries */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>최근 문의</h3>
            <Link to="/admin/inquiries" className="text-xs text-gray-400 hover:text-[var(--brand-blue)] flex items-center gap-1">전체보기 <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-3">
            {recentInquiries.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--brand-navy)" }}>
                    {item.company_name || item.name}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {INQUIRY_TYPE_LABELS[item.inquiry_type] || item.inquiry_type} · {item.created_at?.split("T")[0]}
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
            {recentInquiries.length === 0 && <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>}
          </div>
        </div>

        {/* Recent Applicants */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>최근 지원자</h3>
            <Link to="/admin/applicants" className="text-xs text-gray-400 hover:text-[var(--brand-blue)] flex items-center gap-1">전체보기 <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-3">
            {recentApps.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--brand-navy)" }}>{item.applicant_name}</div>
                  <div className="text-[11px] text-gray-400">{item.job_title}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
            {recentApps.length === 0 && <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>최근 서류발급</h3>
            <Link to="/admin/documents/logs" className="text-xs text-gray-400 hover:text-[var(--brand-blue)] flex items-center gap-1">전체보기 <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-3">
            {recentDocs.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--brand-navy)" }}>{item.employee_name}</div>
                  <div className="text-[11px] text-gray-400">{item.issued_at?.replace("T", " ").slice(0, 16)}</div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 whitespace-nowrap">{item.doc_type_name}</span>
              </div>
            ))}
            {recentDocs.length === 0 && <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>}
          </div>
        </div>
      </div>
    </div>
  );
}