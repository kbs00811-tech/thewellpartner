import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, FileText, Building2, Globe2, Loader2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, Legend, Funnel, FunnelChart,
} from "recharts";
import * as api from "../../lib/api";
import { handleError } from "../../lib/error-handler";

const PIE_COLORS = ["#1e56a0", "#2a7de1", "#0f9d58", "#8b5cf6", "#e63946", "#8b95a5", "#3b7ddb", "#06b6d4"];

const STATUS_ORDER = ["APPLIED", "CONTACTED", "INTERVIEW", "PASSED"];
const STATUS_LABELS_KR: Record<string, string> = {
  APPLIED: "지원접수", CONTACTED: "연락완료", INTERVIEW: "면접", PASSED: "합격", FAILED: "불합격",
  RECEIVED: "접수", CHECKING: "확인중", COUNSELED: "상담완료", HOLD: "보류", CLOSED: "종료",
};

export default function AdminStatistics() {
  const [activeTab, setActiveTab] = useState<"recruit" | "inquiries" | "documents" | "erp" | "foreign">("recruit");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [rawData, setRawData] = useState<{ inquiries: any[]; applications: any[]; employees: any[]; docs: any[] }>({ inquiries: [], applications: [], employees: [], docs: [] });

  useEffect(() => { loadStats(); }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      let result;
      switch (activeTab) {
        case "recruit": result = await api.statistics.recruit(); break;
        case "inquiries": result = await api.statistics.inquiries(); break;
        case "documents": result = await api.statistics.documents(); break;
        case "erp": result = await api.statistics.erp(); break;
        case "foreign": result = await api.statistics.foreign(); break;
      }
      setData(result);

      // 추가 raw data 로드
      if (activeTab === "recruit") {
        const [apps, emps] = await Promise.all([
          api.jobApplications.list().catch(() => []),
          api.employees.list().catch(() => []),
        ]);
        setRawData((prev) => ({ ...prev, applications: Array.isArray(apps) ? apps : [], employees: Array.isArray(emps) ? emps : [] }));
      }
      if (activeTab === "inquiries") {
        const inqs = await api.inquiries.list().catch(() => []);
        setRawData((prev) => ({ ...prev, inquiries: Array.isArray(inqs) ? inqs : [] }));
      }
      if (activeTab === "documents") {
        const docs = await api.issuedDocuments.list().catch(() => []);
        setRawData((prev) => ({ ...prev, docs: Array.isArray(docs) ? docs : [] }));
      }
    } catch (e) { handleError(e, { fallback: "통계 데이터를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: "recruit" as const, label: "채용", icon: Users },
    { key: "inquiries" as const, label: "문의", icon: BarChart3 },
    { key: "documents" as const, label: "서류", icon: FileText },
    { key: "erp" as const, label: "ERP", icon: Building2 },
    { key: "foreign" as const, label: "외국인", icon: Globe2 },
  ];

  const toChartData = (obj: Record<string, number> | undefined) => {
    if (!obj) return [];
    return Object.entries(obj).map(([name, value], i) => ({ name: STATUS_LABELS_KR[name] || name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  };

  // 월별 추이 계산 유틸
  const computeMonthlyTrend = (items: any[], dateField = "created_at") => {
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}월`;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = items.filter((item) => (item[dateField] || "").startsWith(yearMonth)).length;
      months.push({ month: label, count });
    }
    return months;
  };

  // 전환율 계산
  const computeConversionRate = (total: number, converted: number) => {
    if (!total) return 0;
    return Math.round((converted / total) * 100);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  // 채용 퍼널 데이터
  const recruitFunnel = (() => {
    if (activeTab !== "recruit" || !data.applicationsByStatus) return [];
    const statusMap = data.applicationsByStatus || {};
    return STATUS_ORDER.map((s, i) => ({
      name: STATUS_LABELS_KR[s] || s,
      value: statusMap[s] || 0,
      fill: PIE_COLORS[i],
    })).filter((d) => d.value > 0);
  })();

  // 문의 월별 추이
  const inquiryMonthly = activeTab === "inquiries" ? computeMonthlyTrend(rawData.inquiries) : [];

  // 서류 월별 추이
  const docMonthly = activeTab === "documents" ? computeMonthlyTrend(rawData.docs, "issued_at") : [];

  // 지원서 월별 추이
  const appMonthly = activeTab === "recruit" ? computeMonthlyTrend(rawData.applications) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>통계 / 리포트</h1>
        <p className="text-sm text-gray-400 mt-1">주요 운영 지표를 한눈에 확인하세요</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl max-w-3xl">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeTab === tab.key ? { color: "var(--brand-navy)" } : {}}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* ──── Recruit Stats ──── */}
      {activeTab === "recruit" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "전체 공고", value: data.totalJobs || 0, color: "#1e56a0" },
              { label: "진행중 공고", value: data.openJobs || 0, color: "#0f9d58" },
              { label: "전체 지원", value: data.totalApplications || 0, color: "#2a7de1" },
              { label: "합격률", value: `${computeConversionRate(data.totalApplications || 0, (data.applicationsByStatus || {}).PASSED || 0)}%`, color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* 지원 상태별 분포 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>지원 상태별 분포</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={toChartData(data.applicationsByStatus)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {toChartData(data.applicationsByStatus).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 직무별 공고 수 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>직무별 공고 수</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={toChartData(data.jobsByCategory)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {toChartData(data.jobsByCategory).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {toChartData(data.jobsByCategory).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-500 truncate">{item.name}</span>
                    <span className="font-semibold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2 — 채용 퍼널 + 월별 지원 추이 */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* 채용 퍼널 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>채용 퍼널</h3>
              {recruitFunnel.length > 0 ? (
                <div className="space-y-3">
                  {recruitFunnel.map((item, i) => {
                    const maxVal = recruitFunnel[0]?.value || 1;
                    const pct = Math.round((item.value / maxVal) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-600">{item.name}</span>
                          <span className="font-bold" style={{ color: item.fill }}>{item.value}건 ({pct}%)</span>
                        </div>
                        <div className="h-7 rounded-lg bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: item.fill }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {recruitFunnel.length >= 2 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">접수→면접 전환율</div>
                        <div className="text-xl font-bold" style={{ color: "#2a7de1" }}>
                          {computeConversionRate(
                            (data.applicationsByStatus || {}).APPLIED || 0,
                            (data.applicationsByStatus || {}).INTERVIEW || 0
                          )}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">면접→합격 전환율</div>
                        <div className="text-xl font-bold" style={{ color: "#0f9d58" }}>
                          {computeConversionRate(
                            (data.applicationsByStatus || {}).INTERVIEW || 0,
                            (data.applicationsByStatus || {}).PASSED || 0
                          )}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">데이터 없음</div>
              )}
            </div>

            {/* 월별 지원 추이 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>월별 지원 추이 (최근 6개월)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={appMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Area type="monotone" dataKey="count" name="지원 수" fill="rgba(42,125,225,0.15)" stroke="#2a7de1" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ──── Inquiry Stats ──── */}
      {activeTab === "inquiries" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "전체 문의", value: data.total || 0, color: "#1e56a0" },
              { label: "미처리", value: (data.byStatus || {}).RECEIVED || 0, color: "#e63946" },
              { label: "상담완료", value: (data.byStatus || {}).COUNSELED || 0, color: "#0f9d58" },
              { label: "처리율", value: `${computeConversionRate(data.total || 0, ((data.byStatus || {}).COUNSELED || 0) + ((data.byStatus || {}).CLOSED || 0))}%`, color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* 상태별 분포 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--brand-navy)" }}>상태별 분포</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={toChartData(data.byStatus)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {toChartData(data.byStatus).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {toChartData(data.byStatus).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} /><span className="text-xs text-gray-500">{item.name}</span></div>
                    <span className="text-xs font-bold" style={{ color: "var(--brand-navy)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 유형별 분포 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--brand-navy)" }}>유형별 분포</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={toChartData(data.byType)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8b95a5" }} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                    {toChartData(data.byType).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 월별 문의 추이 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--brand-navy)" }}>월별 문의 추이</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={inquiryMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Line type="monotone" dataKey="count" name="문의 수" stroke="#1e56a0" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ──── Document Stats ──── */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "전체 발급", value: data.total || 0, color: "#1e56a0" },
              { label: "성공", value: data.successCount || 0, color: "#0f9d58" },
              { label: "실패", value: data.failCount || 0, color: "#e63946" },
              { label: "성공률", value: `${computeConversionRate(data.total || 0, data.successCount || 0)}%`, color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>문서 유형별 발급 수</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={toChartData(data.byType)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {toChartData(data.byType).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>월별 서류발급 추이</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={docMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Area type="monotone" dataKey="count" name="발급 수" fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ──── ERP Stats ──── */}
      {activeTab === "erp" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "고객사", value: data.totalClients || 0, color: "#1e56a0" },
              { label: "현장", value: data.totalSites || 0, color: "#2a7de1" },
              { label: "근무중 배치", value: data.workingPlacements || 0, color: "#0f9d58" },
              { label: "근태 기록", value: data.totalAttendanceRecords || 0, color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>근태 현황 분포</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={toChartData(data.attendanceByStatus)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {toChartData(data.attendanceByStatus).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {toChartData(data.attendanceByStatus).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-gray-500">{item.name}</span>
                  <span className="font-semibold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──── Foreign Worker Stats ──── */}
      {activeTab === "foreign" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "전체 외국인", value: data.total || 0, color: "#1e56a0" },
              { label: "비자 유형 수", value: Object.keys(data.byVisaType || {}).length, color: "#2a7de1" },
              { label: "국적 수", value: Object.keys(data.byNationality || {}).length, color: "#0f9d58" },
              { label: "상태 유형", value: Object.keys(data.byStatus || {}).length, color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>비자 유형별</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={toChartData(data.byVisaType)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {toChartData(data.byVisaType).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {toChartData(data.byVisaType).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-500 flex-1">{item.name}</span>
                    <span className="font-semibold">{item.value}명</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>국적별</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={toChartData(data.byNationality)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {toChartData(data.byNationality).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {toChartData(data.byNationality).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-500 flex-1">{item.name}</span>
                    <span className="font-semibold">{item.value}명</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--brand-navy)" }}>체류 상태별</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toChartData(data.byStatus)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8b95a5" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8b95a5" }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {toChartData(data.byStatus).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {toChartData(data.byStatus).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-500 flex-1">{item.name}</span>
                    <span className="font-semibold">{item.value}명</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
