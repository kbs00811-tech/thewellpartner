import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import {
  Search, Download, Upload, FileText, CheckCircle2, XCircle,
  Loader2, Eye, Printer, ChevronLeft, ChevronRight, Filter, X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { downloadCsv, ISSUED_DOC_COLUMNS, PAYSLIP_COLUMNS } from "../../lib/csv-export";

/* ──────── PDF 생성 유틸 ──────── */

function generatePayslipPDF(ps: any) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // 헤더
  doc.setFillColor(30, 86, 160);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("급 여 명 세 서", w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.text(`${ps.pay_year}년 ${ps.pay_month}월`, w / 2, 27, { align: "center" });

  // 기본 정보
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  let y = 44;
  const leftX = 20;
  const rightX = w / 2 + 10;

  const infoPairs = [
    ["사번", ps.employee_no || "-"],
    ["이름", ps.employee_name || "-"],
    ["부서", ps.department_name || "-"],
    ["직위", ps.position_name || "-"],
  ];

  infoPairs.forEach(([label, value], i) => {
    const x = i % 2 === 0 ? leftX : rightX;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), x + 20, y);
    if (i % 2 === 1) y += 8;
  });

  y += 12;

  // 테이블 헤더
  doc.setFillColor(245, 247, 250);
  doc.rect(leftX - 5, y - 5, w - 30, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("항목", leftX, y + 1);
  doc.text("금액 (원)", w - 25, y + 1, { align: "right" });
  y += 12;

  // 지급 항목
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 86, 160);
  doc.text("[지급 항목]", leftX, y);
  y += 8;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");

  const payItems = [
    ["기본급", ps.base_salary || ps.gross_pay || 0],
    ["야간수당", ps.night_allowance || 0],
    ["연장수당", ps.overtime_allowance || 0],
    ["식대", ps.meal_allowance || 0],
    ["교통비", ps.transport_allowance || 0],
  ];

  payItems.forEach(([label, amount]) => {
    doc.text(String(label), leftX + 4, y);
    doc.text(Number(amount).toLocaleString(), w - 25, y, { align: "right" });
    y += 7;
  });

  // 총지급액
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(leftX, y, w - 20, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("총 지급액", leftX + 4, y);
  doc.setTextColor(30, 86, 160);
  doc.text((ps.gross_pay || 0).toLocaleString(), w - 25, y, { align: "right" });
  y += 12;

  // 공제 항목
  doc.setTextColor(200, 50, 50);
  doc.text("[공제 항목]", leftX, y);
  y += 8;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");

  const deductItems = [
    ["국민연금", ps.national_pension || 0],
    ["건강보험", ps.health_insurance || 0],
    ["장기요양보험", ps.long_care_insurance || 0],
    ["고용보험", ps.employment_insurance || 0],
    ["소득세", ps.income_tax || 0],
    ["지방소득세", ps.local_income_tax || 0],
  ];

  deductItems.forEach(([label, amount]) => {
    doc.text(String(label), leftX + 4, y);
    doc.text(Number(amount).toLocaleString(), w - 25, y, { align: "right" });
    y += 7;
  });

  // 총공제액
  y += 2;
  doc.line(leftX, y, w - 20, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("총 공제액", leftX + 4, y);
  doc.setTextColor(200, 50, 50);
  doc.text((ps.deduction_amount || 0).toLocaleString(), w - 25, y, { align: "right" });
  y += 14;

  // 실수령액
  doc.setFillColor(30, 86, 160);
  doc.rect(leftX - 5, y - 6, w - 30, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("실수령액", leftX, y + 2);
  doc.text(`${(ps.net_pay || 0).toLocaleString()} 원`, w - 25, y + 2, { align: "right" });

  // 푸터
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text(`발급일: ${new Date().toLocaleDateString("ko-KR")}`, leftX, 280);
  doc.text("본 문서는 전자 발급된 급여명세서입니다.", w / 2, 280, { align: "center" });

  return doc;
}

function generateDocPDF(docType: string, employee: any) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("ko-KR");

  doc.setFillColor(30, 86, 160);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(docType, w / 2, 20, { align: "center" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  let y = 50;

  const fields = [
    ["성명", employee.employee_name || employee.name || "-"],
    ["사번", employee.employee_no || "-"],
    ["부서", employee.department_name || "-"],
    ["직위", employee.position_name || "-"],
    ["입사일", employee.hire_date || "-"],
    ["발급일", today],
  ];

  fields.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 25, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 60, y);
    y += 10;
  });

  y += 10;
  doc.setFontSize(10);
  doc.text(
    `위 사항이 사실임을 증명합니다.`,
    w / 2,
    y,
    { align: "center" }
  );

  y += 20;
  doc.text(today, w / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("더웰파트너", w / 2, y, { align: "center" });

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("본 문서는 전자 발급된 문서입니다.", w / 2, 280, { align: "center" });

  return doc;
}

/* ──────── 페이지네이션 훅 ──────── */
function usePagination<T>(items: T[], perPage = 15) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const pagedItems = items.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [items.length]);

  return { page, setPage, totalPages, pagedItems, total: items.length };
}

/* ──────── 컴포넌트 ──────── */

export default function AdminDocuments() {
  const location = useLocation();
  const pathTab = location.pathname.includes("payslips") ? "payslips" : location.pathname.includes("templates") ? "templates" : "logs";
  const [activeTab, setActiveTab] = useState<"logs" | "payslips" | "templates">(pathTab);
  const [issueLogs, setIssueLogs] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewPS, setPreviewPS] = useState<any>(null);

  // 서류발급 모달
  const [issueModal, setIssueModal] = useState(false);
  const [issueDocType, setIssueDocType] = useState("재직증명서");
  const [issueEmployee, setIssueEmployee] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [issueSearch, setIssueSearch] = useState("");

  const load = async () => {
    try {
      const [logs, pays, tpls, emps] = await Promise.all([
        api.issuedDocuments.list(),
        api.payrollDocuments.list(),
        api.documentTemplates.list(),
        api.employees.list(),
      ]);
      setIssueLogs(logs.sort((a: any, b: any) => (b.issued_at || "").localeCompare(a.issued_at || "")));
      setPayslips(pays);
      setTemplates(tpls);
      setEmployees(emps);
    } catch (e) { handleError(e, { fallback: "서류 데이터를 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // 필터링
  const filteredLogs = issueLogs.filter((l) => {
    const matchSearch = !searchTerm || (l.employee_name || "").includes(searchTerm) || (l.employee_no || "").includes(searchTerm);
    const matchStatus = statusFilter === "all" || l.issue_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredPayslips = payslips.filter((p) =>
    !searchTerm || (p.employee_name || "").includes(searchTerm) || (p.employee_no || "").includes(searchTerm)
  );

  const logsPag = usePagination(filteredLogs);
  const payslipsPag = usePagination(filteredPayslips);

  // PDF 다운로드
  const handleDownloadPayslip = useCallback((ps: any) => {
    const doc = generatePayslipPDF(ps);
    doc.save(`급여명세서_${ps.employee_name}_${ps.pay_year}${String(ps.pay_month).padStart(2, "0")}.pdf`);
  }, []);

  // 서류 발급 + PDF 다운로드
  const handleIssueDocument = async () => {
    if (!issueEmployee) return;
    try {
      // 발급 로그 저장
      await api.issuedDocuments.create({
        employee_name: issueEmployee.name,
        employee_no: issueEmployee.employee_no,
        doc_type_name: issueDocType,
        issued_at: new Date().toISOString(),
        request_ip: "admin",
        issue_status: "SUCCESS",
        download_count: 1,
      });

      // PDF 생성 & 다운로드
      const doc = generateDocPDF(issueDocType, issueEmployee);
      doc.save(`${issueDocType}_${issueEmployee.name}.pdf`);

      setIssueModal(false);
      setIssueEmployee(null);
      handleSuccess("서류가 발급되었습니다.");
      await load();
    } catch (e: any) {
      handleError(e, { fallback: "서류 발급에 실패했습니다." });
    }
  };

  const tabs = [
    { key: "logs" as const, label: "발급 로그", count: issueLogs.length },
    { key: "payslips" as const, label: "급여명세서", count: payslips.length },
    { key: "templates" as const, label: "서류 템플릿", count: templates.length },
  ];

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" size={32} style={{ color: "var(--brand-blue)" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>서류발급 관리</h1>
          <p className="text-sm text-gray-400 mt-1">서류 발급 이력, 급여명세서, 템플릿 관리</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (activeTab === "logs") downloadCsv(filteredLogs, ISSUED_DOC_COLUMNS, `발급로그_${new Date().toISOString().split("T")[0]}`);
              else if (activeTab === "payslips") downloadCsv(filteredPayslips, PAYSLIP_COLUMNS, `급여명세서_${new Date().toISOString().split("T")[0]}`);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <Download size={16} />엑셀 다운로드
          </button>
          <button
            onClick={() => setIssueModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            <Printer size={16} />서류 발급
          </button>
          {activeTab === "payslips" && (
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50">
              <Upload size={16} />급여명세서 업로드
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl max-w-lg">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearchTerm(""); setStatusFilter("all"); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} style={activeTab === tab.key ? { color: "var(--brand-navy)" } : {}}>
            {tab.label}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200/60 text-gray-500">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="이름, 사번 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        {activeTab === "logs" && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {[
              { key: "all", label: "전체" },
              { key: "SUCCESS", label: "성공" },
              { key: "FAILED", label: "실패" },
            ].map((s) => (
              <button key={s.key} onClick={() => setStatusFilter(s.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s.key ? "bg-[var(--brand-navy)] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ──── 발급 로그 ──── */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">사번</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">문서종류</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">발급일시</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">IP</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">결과</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">다운로드</th>
                </tr>
              </thead>
              <tbody>
                {logsPag.pagedItems.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium" style={{ color: "var(--brand-navy)" }}>{log.employee_name}</td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-500">{log.employee_no}</td>
                    <td className="px-4 py-4"><span className="flex items-center gap-1.5 text-gray-600"><FileText size={14} style={{ color: "var(--brand-blue)" }} />{log.doc_type_name}</span></td>
                    <td className="px-4 py-4 text-gray-500 text-xs">{log.issued_at?.replace("T", " ").slice(0, 16)}</td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-400">{log.request_ip}</td>
                    <td className="px-4 py-4">
                      {log.issue_status === "SUCCESS" ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 size={14} /> 성공</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><XCircle size={14} /> 실패</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium" style={{ color: "var(--brand-blue)" }}>{log.download_count}회</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
          <PaginationBar {...logsPag} />
        </div>
      )}

      {/* ──── 급여명세서 ──── */}
      {activeTab === "payslips" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-400 text-xs">사번</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">이름</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">연도</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-400 text-xs">월</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-400 text-xs">총지급액</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-400 text-xs">공제액</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-400 text-xs">실수령액</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-400 text-xs">관리</th>
                </tr>
              </thead>
              <tbody>
                {payslipsPag.pagedItems.map((ps: any) => (
                  <tr key={ps.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">{ps.employee_no}</td>
                    <td className="px-4 py-4 font-medium" style={{ color: "var(--brand-navy)" }}>{ps.employee_name}</td>
                    <td className="px-4 py-4 text-gray-600">{ps.pay_year}</td>
                    <td className="px-4 py-4 text-gray-600">{ps.pay_month}월</td>
                    <td className="px-4 py-4 text-right text-gray-600">{(ps.gross_pay || 0).toLocaleString()}원</td>
                    <td className="px-4 py-4 text-right text-red-500">{(ps.deduction_amount || 0).toLocaleString()}원</td>
                    <td className="px-4 py-4 text-right font-semibold" style={{ color: "var(--brand-blue)" }}>{(ps.net_pay || 0).toLocaleString()}원</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setPreviewPS(ps)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500" title="미리보기"><Eye size={15} /></button>
                        <button onClick={() => handleDownloadPayslip(ps)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500" title="PDF 다운로드"><Download size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayslips.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">데이터가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
          <PaginationBar {...payslipsPag} />
        </div>
      )}

      {/* ──── 템플릿 ──── */}
      {activeTab === "templates" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-transparent transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-sky)" }}><FileText size={20} style={{ color: "var(--brand-blue)" }} /></div>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: tpl.is_active ? "rgba(15,157,88,0.1)" : "rgba(139,149,165,0.1)", color: tpl.is_active ? "#0f9d58" : "#8b95a5" }}>{tpl.is_active ? "활성" : "비활성"}</span>
              </div>
              <h3 className="font-bold mb-1" style={{ color: "var(--brand-navy)" }}>{tpl.template_name}</h3>
              <div className="text-xs text-gray-400 flex items-center gap-3 mt-2">
                <span>{tpl.version_no}</span><span>·</span><span>{tpl.doc_type}</span>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">미리보기</button>
                <button className="flex-1 py-2 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: "var(--brand-blue)" }}>수정</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <div className="col-span-full text-center py-16 text-gray-400">등록된 템플릿이 없습니다.</div>}
        </div>
      )}

      {/* ──── 급여명세서 미리보기 모달 ──── */}
      {previewPS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewPS(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>급여명세서 미리보기</h3>
              <button onClick={() => setPreviewPS(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="rounded-xl border border-gray-100 p-5 space-y-4 text-sm">
              <div className="text-center pb-3 border-b border-gray-100">
                <h4 className="text-base font-bold" style={{ color: "var(--brand-navy)" }}>{previewPS.pay_year}년 {previewPS.pay_month}월 급여명세서</h4>
                <p className="text-xs text-gray-400 mt-1">{previewPS.employee_name} ({previewPS.employee_no})</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-400">총 지급액</span>
                  <div className="font-bold text-base mt-1" style={{ color: "var(--brand-navy)" }}>{(previewPS.gross_pay || 0).toLocaleString()}원</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <span className="text-gray-400">총 공제액</span>
                  <div className="font-bold text-base mt-1 text-red-500">{(previewPS.deduction_amount || 0).toLocaleString()}원</div>
                </div>
              </div>

              <div className="rounded-lg p-4 text-center" style={{ backgroundColor: "var(--brand-sky)" }}>
                <span className="text-xs text-gray-500">실수령액</span>
                <div className="text-xl font-bold mt-1" style={{ color: "var(--brand-blue)" }}>{(previewPS.net_pay || 0).toLocaleString()}원</div>
              </div>
            </div>

            <button
              onClick={() => { handleDownloadPayslip(previewPS); setPreviewPS(null); }}
              className="w-full mt-4 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Download size={16} />PDF 다운로드
            </button>
          </div>
        </div>
      )}

      {/* ──── 서류 발급 모달 ──── */}
      {issueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIssueModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>서류 발급</h3>
              <button onClick={() => setIssueModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* 문서 종류 */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-2">문서 종류</label>
              <div className="flex gap-2 flex-wrap">
                {["재직증명서", "경력증명서", "퇴직증명서", "급여확인서"].map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setIssueDocType(dt)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${issueDocType === dt ? "text-white shadow-md" : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"}`}
                    style={issueDocType === dt ? { backgroundColor: "var(--brand-blue)" } : {}}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>

            {/* 직원 선택 */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-2">직원 선택</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
                <Search size={16} className="text-gray-400" />
                <input type="text" placeholder="이름 또는 사번 검색..." value={issueSearch} onChange={(e) => setIssueSearch(e.target.value)} className="bg-transparent text-sm flex-1 outline-none" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {employees
                  .filter((e) => !issueSearch || (e.name || "").includes(issueSearch) || (e.employee_no || "").includes(issueSearch))
                  .slice(0, 20)
                  .map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setIssueEmployee(emp)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${issueEmployee?.id === emp.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: issueEmployee?.id === emp.id ? "var(--brand-blue)" : "var(--brand-navy)" }}>
                        {(emp.name || "?")[0]}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: "var(--brand-navy)" }}>{emp.name}</div>
                        <div className="text-[11px] text-gray-400">{emp.employee_no} · {emp.department_name || "미배정"}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* 선택된 정보 요약 */}
            {issueEmployee && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
                <div className="text-xs text-gray-500 mb-1">발급 대상</div>
                <div className="font-bold" style={{ color: "var(--brand-navy)" }}>{issueEmployee.name} ({issueEmployee.employee_no})</div>
                <div className="text-xs text-gray-400 mt-0.5">{issueDocType} 발급 예정</div>
              </div>
            )}

            <button
              onClick={handleIssueDocument}
              disabled={!issueEmployee}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-blue-500/25"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Printer size={16} />서류 발급 및 PDF 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──── 공용 페이지네이션 ──── */
function PaginationBar({ page, setPage, totalPages, total }: { page: number; setPage: (p: number) => void; totalPages: number; total: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">총 {total}건</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} className="text-gray-500" /></button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
          .reduce((acc: (number | "...")[], p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`dot-${i}`} className="px-1 text-xs text-gray-300">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-all ${page === p ? "text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={page === p ? { backgroundColor: "var(--brand-blue)" } : {}}
              >
                {p}
              </button>
            )
          )}
        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} className="text-gray-500" /></button>
      </div>
    </div>
  );
}