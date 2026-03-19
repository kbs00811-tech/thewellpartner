import { useState, useEffect } from "react";
import { Loader2, Users, Briefcase, TrendingUp, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as api from "../../lib/api";
import { handleError } from "../../lib/error-handler";

const PIE_COLORS = ["#1e56a0", "#2a7de1", "#0f9d58", "#8b5cf6", "#e63946", "#8b95a5", "#06b6d4", "#f59e0b"];

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "신규접수", CONTACTED: "연락완료", COUNSELED: "상담완료", INTERVIEW: "면접예정",
  PASSED: "합격", FAILED: "불합격", HOLD: "보류",
};

export default function AdminRecruitStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [s, j, a] = await Promise.all([
        api.statistics.recruit(),
        api.jobPosts.list(),
        api.jobApplications.listEnriched(),
      ]);
      setStats(s);
      setJobs(Array.isArray(j) ? j : []);
      setApplications(Array.isArray(a) ? a : []);
    } catch (e) { handleError(e, { fallback: "채용 통계를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const toChartData = (obj: Record<string, number> | undefined) => {
    if (!obj) return [];
    return Object.entries(obj).map(([name, value], i) => ({
      name: STATUS_LABELS[name] || name,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  };

  // Per-job stats
  const jobStats = jobs.map(j => {
    const apps = applications.filter(a => a.job_post_id === j.id);
    const passed = apps.filter(a => a.status === "PASSED").length;
    return {
      id: j.id,
      title: j.title,
      company: j.company_name,
      status: j.status,
      count: apps.length,
      passed,
      conversionRate: apps.length > 0 ? Math.round((passed / apps.length) * 100) : 0,
    };
  }).sort((a, b) => b.count - a.count);

  // Conversion funnel
  const funnelData = [
    { name: "지원", value: stats.totalApplications || 0 },
    { name: "연락/상담", value: (stats.applicationsByStatus?.CONTACTED || 0) + (stats.applicationsByStatus?.COUNSELED || 0) },
    { name: "면접", value: stats.applicationsByStatus?.INTERVIEW || 0 },
    { name: "합격", value: stats.applicationsByStatus?.PASSED || 0 },
  ];

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>채용 통계 대시보드</h1>
        <p className="text-sm text-gray-400 mt-1">채용 현황·전환율·공고별 분석</p>
      </div>

      {/* KPI */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 공고", value: stats.totalJobs || 0, color: "#1e56a0", icon: Briefcase },
          { label: "진행중", value: stats.openJobs || 0, color: "#0f9d58", icon: TrendingUp },
          { label: "전체 지원", value: stats.totalApplications || 0, color: "#2a7de1", icon: Users },
          { label: "합격률", value: stats.totalApplications > 0 ? `${Math.round(((stats.applicationsByStatus?.PASSED || 0) / stats.totalApplications) * 100)}%` : "0%", color: "#8b5cf6", icon: Target },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{kpi.label}</span>
              <kpi.icon size={16} style={{ color: kpi.color }} />
            </div>
            <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>채용 전환 퍼널</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#8b95a5" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8b95a5" }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {funnelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>지원 상태별 분포</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={toChartData(stats.applicationsByStatus)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {toChartData(stats.applicationsByStatus).map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {toChartData(stats.applicationsByStatus).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-gray-500">{item.name}</span>
                <span className="font-semibold ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-Job Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>공고별 지원 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">공고명</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">고객사</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">상태</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">지원수</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">합격수</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">전환율</th>
              </tr>
            </thead>
            <tbody>
              {jobStats.map(j => (
                <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-semibold" style={{ color: "var(--brand-navy)" }}>{j.title}</td>
                  <td className="px-4 py-4 text-gray-500">{j.company}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${j.status === "OPEN" ? "bg-green-50 text-green-600" : j.status === "CLOSED" ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-600"}`}>
                      {j.status === "OPEN" ? "진행중" : j.status === "CLOSED" ? "마감" : "숨김"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center font-semibold" style={{ color: "var(--brand-blue)" }}>{j.count}</td>
                  <td className="px-4 py-4 text-center font-semibold text-green-600">{j.passed}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${j.conversionRate}%`, backgroundColor: j.conversionRate >= 50 ? "#0f9d58" : j.conversionRate >= 20 ? "#2a7de1" : "#e63946" }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: j.conversionRate >= 50 ? "#0f9d58" : j.conversionRate >= 20 ? "#2a7de1" : "#e63946" }}>{j.conversionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
