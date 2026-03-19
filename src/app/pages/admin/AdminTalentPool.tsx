import { useState, useEffect } from "react";
import { Search, Download, Loader2, User, MapPin, Briefcase, Flag, Phone, Mail, X, UserPlus, Eye } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

export default function AdminTalentPool() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, apps] = await Promise.all([api.applicants.list(), api.jobApplications.listEnriched()]);
      setApplicants(a.sort((x: any, y: any) => (y.created_at || "").localeCompare(x.created_at || "")));
      setApplications(apps);
    } catch (e) { handleError(e, { fallback: "인재풀 데이터를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  const getAppHistory = (applicantId: string) => applications.filter(a => a.applicant_id === applicantId);

  const nationalities = [...new Set(applicants.map(a => a.nationality).filter(Boolean))];
  const desiredJobs = [...new Set(applicants.map(a => a.desired_job).filter(Boolean))];

  const filtered = applicants.filter(a => {
    const matchSearch = !searchTerm || (a.name || "").includes(searchTerm) || (a.mobile || "").includes(searchTerm) || (a.email || "").includes(searchTerm);
    const matchNat = nationalityFilter === "all" || a.nationality === nationalityFilter;
    const matchJob = jobFilter === "all" || a.desired_job === jobFilter;
    return matchSearch && matchNat && matchJob;
  });

  const handleConvertToEmployee = async (applicant: any) => {
    if (!confirm(`${applicant.name}님을 직원으로 전환하시겠습니까?`)) return;
    try {
      await api.employees.create({
        name: applicant.name,
        birth_date: applicant.birth_date,
        mobile: applicant.mobile,
        email: applicant.email,
        nationality: applicant.nationality,
        employment_status: "ACTIVE",
        employment_type: "계약직",
        department_name: "미배정",
        position_name: "사원",
        hire_date: new Date().toISOString().split("T")[0],
      });
      handleSuccess(`${applicant.name}님이 직원으로 전환되었습니다.`);
    } catch (e) { handleError(e, { fallback: "직원 전환에 실패했습니다." }); }
  };

  const handleExportCSV = () => {
    const headers = ["이름,연락처,이메일,국적,희망직무,경력,주소,지원일"];
    const rows = filtered.map(a => `${a.name},${a.mobile},${a.email},${a.nationality},${a.desired_job},${a.career_summary},"${a.current_address}",${a.created_at?.split("T")[0]}`);
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `talent-pool-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>인재풀 관리</h1>
          <p className="text-sm text-gray-400 mt-1">전체 지원자 통합 검색 · 직원 전환</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"><Download size={16} />CSV 다운로드</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 인재", value: applicants.length, color: "#1e56a0" },
          { label: "내국인", value: applicants.filter(a => a.nationality === "한국").length, color: "#2a7de1" },
          { label: "외국인", value: applicants.filter(a => a.nationality && a.nationality !== "한국").length, color: "#0f9d58" },
          { label: "국적 수", value: nationalities.length, color: "#8b5cf6" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="이름, 연락처, 이메일..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm">
          <option value="all">국적 전체</option>
          {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm">
          <option value="all">직무 전체</option>
          {desiredJobs.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length}명</span>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 border-l-4 border-l-[var(--brand-blue)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>{selected.name} 상세</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {[
              { icon: Phone, label: "연락처", value: selected.mobile },
              { icon: Mail, label: "이메일", value: selected.email || "-" },
              { icon: Flag, label: "국적", value: selected.nationality },
              { icon: MapPin, label: "주소", value: selected.current_address || "-" },
              { icon: Briefcase, label: "희망직무", value: selected.desired_job || "-" },
              { icon: User, label: "경력", value: selected.career_summary || "무경력" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <item.icon size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">{item.label}:</span>
                <span className="font-medium" style={{ color: "var(--brand-navy)" }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">지원 이력</h4>
            {getAppHistory(selected.id).length > 0 ? (
              <div className="space-y-2">
                {getAppHistory(selected.id).map((app: any) => (
                  <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-sm">
                    <span className="font-semibold" style={{ color: "var(--brand-navy)" }}>{app.job_title}</span>
                    <span className="text-xs text-gray-400">{app.job_company}</span>
                    <span className="ml-auto px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: "rgba(42,125,225,0.1)", color: "#2a7de1" }}>{app.status}</span>
                    <span className="text-xs text-gray-400">{app.applied_at?.split("T")[0]}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">지원 이력 없음</p>}
          </div>
          <button onClick={() => handleConvertToEmployee(selected)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "var(--brand-blue)" }}>
            <UserPlus size={16} />직원 전환
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">연락처</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">국적</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">희망직무</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">경력</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">지역</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">지원일</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">지원수</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">상세</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelected(a)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: a.nationality === "한국" ? "var(--brand-blue)" : "#0f9d58" }}>{(a.name || "?")[0]}</div>
                      <span className="font-semibold" style={{ color: "var(--brand-navy)" }}>{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{a.mobile}</td>
                  <td className="px-4 py-4"><span className="flex items-center gap-1 text-xs"><Flag size={12} />{a.nationality}</span></td>
                  <td className="px-4 py-4 text-gray-600">{a.desired_job || "-"}</td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{a.career_summary || "무경력"}</td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{a.desired_location || "-"}</td>
                  <td className="px-4 py-4 text-gray-400 text-xs">{a.created_at?.split("T")[0]}</td>
                  <td className="px-4 py-4 text-center"><span className="font-semibold" style={{ color: "var(--brand-blue)" }}>{getAppHistory(a.id).length}</span></td>
                  <td className="px-4 py-4 text-center"><button className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Eye size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
