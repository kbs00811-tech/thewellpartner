import { useState, useEffect, useMemo, useCallback } from "react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { downloadCsv, PAYSLIP_COLUMNS } from "../../lib/csv-export";
import {
  FileSpreadsheet, Plus, Send, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, ChevronRight, Search, Filter, Users, MessageCircle,
  Edit3, Trash2, Eye, X, Save, RefreshCw, Check, Clock, ArrowUpDown,
  MoreVertical, Download,
} from "lucide-react";

/* ────────────────────────────────────────── helpers */
const fmt = (n: number | string) => Number(n || 0).toLocaleString();
const statusLabel: Record<string, { text: string; color: string }> = {
  DRAFT:     { text: "작성중", color: "bg-gray-100 text-gray-600" },
  CONFIRMED: { text: "확정",   color: "bg-blue-50 text-blue-700" },
  SENT:      { text: "전송완료", color: "bg-green-50 text-green-700" },
};
const kakaoStatusLabel: Record<string, { text: string; color: string }> = {
  SUCCESS: { text: "성공", color: "text-green-600" },
  FAILED:  { text: "실패", color: "text-red-600" },
};

type View = "list" | "create" | "edit" | "preview" | "kakao";

export default function AdminPayroll() {
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  /* batch-create form */
  const [batchMonth, setBatchMonth] = useState(filterMonth);

  /* kakao mgmt */
  const [kakaoEmployees, setKakaoEmployees] = useState<any[]>([]);
  const [editingKakaoId, setEditingKakaoId] = useState<Record<string, string>>({});

  /* mobile action menu */
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ─── Data loading ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [slipRes, empRes] = await Promise.all([
        api.payroll.list(),
        api.employees.list(),
      ]);
      setSlips(Array.isArray(slipRes) ? slipRes : []);
      setEmployees(Array.isArray(empRes) ? empRes : []);
    } catch (e: any) {
      handleError(e, { fallback: "급여 데이터를 불러오지 못했습니다." });
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Filtered slips ─── */
  const filteredSlips = useMemo(() => {
    let list = slips;
    if (filterMonth) list = list.filter(s => s.pay_year_month === filterMonth);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.employee_name || "").toLowerCase().includes(term) ||
        (s.employee_no || "").toLowerCase().includes(term) ||
        (s.department || "").toLowerCase().includes(term)
      );
    }
    return list.sort((a, b) => (a.employee_name || "").localeCompare(b.employee_name || ""));
  }, [slips, filterMonth, searchTerm]);

  /* ─── Summary stats ─── */
  const stats = useMemo(() => {
    const items = filteredSlips;
    return {
      total: items.length,
      draft: items.filter(s => s.status === "DRAFT").length,
      confirmed: items.filter(s => s.status === "CONFIRMED").length,
      sent: items.filter(s => s.status === "SENT").length,
      totalPay: items.reduce((sum, s) => sum + Number(s.total_pay || 0), 0),
      totalNet: items.reduce((sum, s) => sum + Number(s.net_pay || 0), 0),
    };
  }, [filteredSlips]);

  /* ─── Actions ─── */
  const handleBatchCreate = async () => {
    if (!batchMonth) return;
    setLoading(true);
    try {
      const data = await api.payroll.batchCreate({ payYearMonth: batchMonth });
      handleSuccess(`${data.created}건 생성 완료${data.skipped ? `, ${data.skipped}건 중복 제외` : ""}`);
      await loadData();
      setView("list");
      setFilterMonth(batchMonth);
    } catch (e: any) { handleError(e, { fallback: "급여명세서 일괄 생성에 실패했습니다." }); }
    finally { setLoading(false); }
  };

  const handleSaveSlip = async (slip: any) => {
    setLoading(true);
    try {
      const totalPay = Number(slip.base_salary || 0) + Number(slip.overtime_pay || 0) + Number(slip.night_pay || 0)
        + Number(slip.holiday_pay || 0) + Number(slip.meal_allowance || 0) + Number(slip.transport_allowance || 0)
        + Number(slip.bonus || 0) + Number(slip.other_pay || 0);
      const totalDeduction = Number(slip.income_tax || 0) + Number(slip.local_tax || 0) + Number(slip.national_pension || 0)
        + Number(slip.health_insurance || 0) + Number(slip.long_term_care || 0) + Number(slip.employment_insurance || 0)
        + Number(slip.other_deduction || 0);
      const updated = { ...slip, total_pay: totalPay, total_deduction: totalDeduction, net_pay: totalPay - totalDeduction };
      await api.payroll.update(slip.id, updated);
      handleSuccess("급여명세서가 저장되었습니다.");
      await loadData();
      setView("list");
    } catch (e: any) { handleError(e, { fallback: "급여명세서 저장에 실패했습니다." }); }
    finally { setLoading(false); }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.payroll.confirm(id);
      handleSuccess("확정 완료");
      await loadData();
    } catch (e: any) { handleError(e, { fallback: "확정 처리에 실패했습니다." }); }
  };

  const handleBatchConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      const data = await api.payroll.batchConfirm(ids);
      handleSuccess(`${data.confirmed}건 확정 완료`);
      setSelectedIds(new Set());
      await loadData();
    } catch (e: any) { handleError(e, { fallback: "일괄 확정에 실패했습니다." }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 급여명세서를 삭제하시겠습니까?")) return;
    try {
      await api.payroll.remove(id);
      handleSuccess("삭제 완료");
      await loadData();
    } catch (e: any) { handleError(e, { fallback: "급여명세서 삭제에 실패했습니다." }); }
  };

  const handleSendKakao = async (id: string) => {
    if (!confirm("카카오톡으로 전송하시겠습니까?")) return;
    setLoading(true);
    try {
      await api.payroll.sendKakao(id);
      handleSuccess("카카오톡 전송 완료");
      await loadData();
    } catch (e: any) { handleError(e, { fallback: "카카오톡 전송에 실패했습니다." }); }
    finally { setLoading(false); }
  };

  const handleBatchSendKakao = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!confirm(`선택한 ${ids.length}건을 카카오톡으로 전송하시겠습니까?`)) return;
    setLoading(true);
    try {
      const data = await api.payroll.batchSendKakao(ids);
      handleSuccess(`성공 ${data.success}건, 실패 ${data.failed}건, 제외 ${data.skipped}건`);
      setSelectedIds(new Set());
      await loadData();
    } catch (e: any) { handleError(e, { fallback: "카카오톡 일괄 전송에 실패했습니다." }); }
    finally { setLoading(false); }
  };

  /* ─── Toggle selection ─── */
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSlips.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredSlips.map(s => s.id)));
  };

  /* ─── Kakao Management ─── */
  const loadKakaoEmployees = async () => {
    try {
      const res = await api.payroll.getKakaoEmployees();
      setKakaoEmployees(Array.isArray(res) ? res : []);
    } catch (e: any) { handleError(e, { fallback: "카카오톡 직원 목록을 불러오지 못했습니다." }); }
  };

  const saveKakaoId = async (empId: string) => {
    const kakaoId = editingKakaoId[empId];
    if (kakaoId === undefined) return;
    try {
      await api.payroll.updateKakaoId(empId, kakaoId);
      handleSuccess("카카오톡 ID 저장 완료");
      setEditingKakaoId(prev => { const copy = { ...prev }; delete copy[empId]; return copy; });
      await loadKakaoEmployees();
    } catch (e: any) { handleError(e, { fallback: "카카오톡 ID 저장에 실패했습니다." }); }
  };

  /* ────────────────────────────────────────── unique months for filter */
  const monthOptions = useMemo(() => {
    const months = [...new Set(slips.map(s => s.pay_year_month).filter(Boolean))];
    months.sort((a, b) => b.localeCompare(a));
    if (filterMonth && !months.includes(filterMonth)) months.unshift(filterMonth);
    return months;
  }, [slips, filterMonth]);

  /* ════════════════════════════════════════ RENDER ════════════════════════════════════════ */

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
          <span className="line-clamp-2">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">급여명세서 관리</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">엑셀 양식 기반 급여명세서 작성 및 카카오톡 자동 전송</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setView("kakao"); loadKakaoEmployees(); }}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              view === "kakao" ? "bg-yellow-400 text-yellow-900" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <MessageCircle size={15} />
            <span className="hidden xs:inline">카카오톡</span> ID 관리
          </button>
          <button
            onClick={() => downloadCsv(filteredSlips, PAYSLIP_COLUMNS, `급여명세서_${filterMonth}`)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            CSV 다운로드
          </button>
          <button
            onClick={() => { setView("create"); setBatchMonth(filterMonth); }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#0f1b33] text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-[#1a2847] transition-colors"
          >
            <Plus size={15} />
            일괄생성
          </button>
        </div>
      </div>

      {/* ══════ VIEW: KAKAO ID 관리 ══════ */}
      {view === "kakao" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle size={18} className="text-yellow-500 flex-shrink-0" />
                <span className="truncate">직원 카카오톡 ID 관리</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">직원별 카카오톡 ID를 등록하세요</p>
            </div>
            <button onClick={() => setView("list")} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X size={18} /></button>
          </div>

          <div className="p-4 sm:p-6">
            {/* 안내 배너 */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-yellow-50 border border-yellow-100">
              <div className="flex gap-2 sm:gap-3">
                <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm min-w-0">
                  <p className="font-semibold text-yellow-800 mb-0.5 sm:mb-1">카카오 알림톡 연동 안내</p>
                  <p className="text-yellow-700">
                    현재 <strong>데모 모드</strong>로 동작합니다. 실제 전송을 위해서는 카카오 비즈니스 채널 및 API 키를 환경변수에 등록하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">사번</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">이름</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">부서</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">카카오톡 ID</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">상태</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {kakaoEmployees.map(emp => {
                    const isEditing = editingKakaoId[emp.id] !== undefined;
                    return (
                      <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-mono text-xs text-gray-500">{emp.employee_no}</td>
                        <td className="py-3 px-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="py-3 px-3 text-gray-600">{emp.department || "-"}</td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <input type="text" value={editingKakaoId[emp.id]}
                              onChange={e => setEditingKakaoId(prev => ({ ...prev, [emp.id]: e.target.value }))}
                              className="w-40 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                              placeholder="카카오톡 ID 입력" autoFocus />
                          ) : (
                            <span className={emp.kakao_id ? "text-gray-900" : "text-gray-300 italic"}>
                              {emp.kakao_id || "미등록"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {emp.has_kakao ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700">
                              <Check size={12} /> 등록완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">미등록</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={() => saveKakaoId(emp.id)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="저장"><Save size={14} /></button>
                              <button onClick={() => setEditingKakaoId(prev => { const c = { ...prev }; delete c[emp.id]; return c; })} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100" title="취소"><X size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingKakaoId(prev => ({ ...prev, [emp.id]: emp.kakao_id || "" }))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="수정"><Edit3 size={14} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {kakaoEmployees.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400">등록된 직원이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden space-y-3">
              {kakaoEmployees.map(emp => {
                const isEditing = editingKakaoId[emp.id] !== undefined;
                return (
                  <div key={emp.id} className="border border-gray-100 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-900 text-sm truncate">{emp.name}</span>
                        <span className="font-mono text-[11px] text-gray-400">{emp.employee_no}</span>
                      </div>
                      {emp.has_kakao ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-green-50 text-green-700 flex-shrink-0">
                          <Check size={10} /> 등록
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500 flex-shrink-0">미등록</span>
                      )}
                    </div>
                    {emp.department && <p className="text-xs text-gray-500 mb-2">{emp.department}</p>}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input type="text" value={editingKakaoId[emp.id]}
                            onChange={e => setEditingKakaoId(prev => ({ ...prev, [emp.id]: e.target.value }))}
                            className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            placeholder="카카오톡 ID" autoFocus />
                          <button onClick={() => saveKakaoId(emp.id)} className="p-2 rounded-lg bg-blue-50 text-blue-600 active:bg-blue-100"><Save size={16} /></button>
                          <button onClick={() => setEditingKakaoId(prev => { const c = { ...prev }; delete c[emp.id]; return c; })} className="p-2 rounded-lg bg-gray-50 text-gray-500 active:bg-gray-100"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 px-3 py-2 text-sm bg-gray-50 rounded-lg truncate">
                            <span className={emp.kakao_id ? "text-gray-900" : "text-gray-300 italic"}>
                              {emp.kakao_id || "미등록"}
                            </span>
                          </div>
                          <button onClick={() => setEditingKakaoId(prev => ({ ...prev, [emp.id]: emp.kakao_id || "" }))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 active:bg-gray-200"><Edit3 size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {kakaoEmployees.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">등록된 직원이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ VIEW: 일괄 생성 ══════ */}
      {view === "create" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4">급여명세서 일괄 생성</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">선택한 월의 재직 직원 전원에 대해 급여명세서를 일괄 생성합니다.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">급여년월</label>
              <input
                type="month"
                value={batchMonth}
                onChange={e => setBatchMonth(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBatchCreate}
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0f1b33] text-white rounded-xl text-sm font-medium hover:bg-[#1a2847] disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                생성
              </button>
              <button onClick={() => setView("list")} className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ VIEW: 편집 (엑셀 양식) ══════ */}
      {view === "edit" && selectedSlip && (
        <PayslipEditor
          slip={selectedSlip}
          onSave={handleSaveSlip}
          onCancel={() => { setView("list"); setSelectedSlip(null); }}
          loading={loading}
        />
      )}

      {/* ══════ VIEW: 미리보기 ══════ */}
      {view === "preview" && selectedSlip && (
        <PayslipPreview
          slip={selectedSlip}
          onClose={() => { setView("list"); setSelectedSlip(null); }}
          onSendKakao={() => handleSendKakao(selectedSlip.id)}
          loading={loading}
        />
      )}

      {/* ══════ VIEW: 목록 ══════ */}
      {(view === "list" || view === "create") && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {[
              { label: "전체", value: stats.total, color: "text-gray-900" },
              { label: "작성중", value: stats.draft, color: "text-gray-500" },
              { label: "확정", value: stats.confirmed, color: "text-blue-600" },
              { label: "전송완료", value: stats.sent, color: "text-green-600" },
              { label: "총 지급액", value: `₩${fmt(stats.totalPay)}`, color: "text-gray-900", wide: true },
              { label: "총 실수령", value: `₩${fmt(stats.totalNet)}`, color: "text-[var(--brand-blue)]", wide: true },
            ].map((s: any, i) => (
              <div key={i} className={`bg-white rounded-xl border border-gray-100 p-2.5 sm:p-4 ${s.wide ? "col-span-1" : ""}`}>
                <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">{s.label}</div>
                <div className={`text-sm sm:text-lg font-bold ${s.color} truncate`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters + Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-3 sm:p-4 border-b border-gray-100 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0 sm:flex-none">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="이름, 사번, 부서..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full sm:w-48 pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="px-2.5 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  {monthOptions.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0" title="새로고침">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 text-sm overflow-x-auto pb-0.5">
                  <span className="text-gray-500 flex-shrink-0">{selectedIds.size}건</span>
                  <button
                    onClick={handleBatchConfirm}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors flex-shrink-0 text-xs sm:text-sm"
                  >
                    <CheckCircle2 size={13} /> 일괄 확정
                  </button>
                  <button
                    onClick={handleBatchSendKakao}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg font-medium hover:bg-yellow-100 transition-colors flex-shrink-0 text-xs sm:text-sm"
                  >
                    <Send size={13} /> 일괄 전송
                  </button>
                </div>
              )}
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="w-10 py-3 px-3">
                      <input type="checkbox" checked={selectedIds.size === filteredSlips.length && filteredSlips.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">사번</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">이름</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">부서</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-600">지급총액</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-600">공제총액</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-600">실수령액</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">상태</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">카카오</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlips.map(slip => {
                    const st = statusLabel[slip.status] || statusLabel.DRAFT;
                    const ks = slip.kakao_send_status ? (kakaoStatusLabel[slip.kakao_send_status] || null) : null;
                    return (
                      <tr key={slip.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-3">
                          <input type="checkbox" checked={selectedIds.has(slip.id)} onChange={() => toggleSelect(slip.id)} className="rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-gray-500">{slip.employee_no}</td>
                        <td className="py-3 px-3 font-medium text-gray-900">{slip.employee_name}</td>
                        <td className="py-3 px-3 text-gray-600">{slip.department || "-"}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">{fmt(slip.total_pay)}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-red-500">{fmt(slip.total_deduction)}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">{fmt(slip.net_pay)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.text}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {ks ? <span className={`text-xs font-medium ${ks.color}`}>{ks.text}</span> : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => { setSelectedSlip(slip); setView("edit"); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="편집"><Edit3 size={14} /></button>
                            <button onClick={() => { setSelectedSlip(slip); setView("preview"); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="미리보기"><Eye size={14} /></button>
                            {slip.status === "DRAFT" && (
                              <button onClick={() => handleConfirm(slip.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600" title="확정"><CheckCircle2 size={14} /></button>
                            )}
                            {(slip.status === "CONFIRMED" || slip.status === "SENT") && (
                              <button onClick={() => handleSendKakao(slip.id)} className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="카카오 전송"><Send size={14} /></button>
                            )}
                            {slip.status === "DRAFT" && (
                              <button onClick={() => handleDelete(slip.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500" title="삭제"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSlips.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-gray-400 text-sm">{filterMonth}월 급여명세서가 없습니다.</p>
                        <button onClick={() => { setView("create"); setBatchMonth(filterMonth); }} className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--brand-blue)] font-medium hover:underline">
                          <Plus size={14} /> 일괄 생성하기
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 리스트 */}
            <div className="lg:hidden">
              {/* 전체 선택 */}
              {filteredSlips.length > 0 && (
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.size === filteredSlips.length && filteredSlips.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                  <span className="text-xs text-gray-500">전체 선택 ({filteredSlips.length}명)</span>
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {filteredSlips.map(slip => {
                  const st = statusLabel[slip.status] || statusLabel.DRAFT;
                  const ks = slip.kakao_send_status ? (kakaoStatusLabel[slip.kakao_send_status] || null) : null;
                  const isOpen = openActionId === slip.id;
                  return (
                    <div key={slip.id} className={`p-3 sm:p-4 ${selectedIds.has(slip.id) ? "bg-blue-50/40" : ""}`}>
                      {/* 상단: 체크박스 + 이름 + 상태 */}
                      <div className="flex items-center gap-2.5 mb-2">
                        <input type="checkbox" checked={selectedIds.has(slip.id)} onChange={() => toggleSelect(slip.id)} className="rounded border-gray-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm text-gray-900 truncate">{slip.employee_name}</span>
                            <span className="font-mono text-[11px] text-gray-400">{slip.employee_no}</span>
                          </div>
                          {slip.department && <p className="text-[11px] text-gray-500">{slip.department}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${st.color}`}>{st.text}</span>
                          {ks && <span className={`text-[11px] font-medium ${ks.color}`}>{ks.text}</span>}
                        </div>
                      </div>

                      {/* 금액 */}
                      <div className="grid grid-cols-3 gap-2 ml-7 mb-2">
                        <div>
                          <div className="text-[10px] text-gray-400">지급</div>
                          <div className="text-xs font-mono tabular-nums text-gray-700">{fmt(slip.total_pay)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">공제</div>
                          <div className="text-xs font-mono tabular-nums text-red-500">{fmt(slip.total_deduction)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">실수령</div>
                          <div className="text-xs font-mono tabular-nums font-bold text-gray-900">{fmt(slip.net_pay)}</div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-1 ml-7">
                        <button onClick={() => { setSelectedSlip(slip); setView("edit"); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-600 hover:bg-gray-100 active:bg-gray-200">
                          <Edit3 size={12} /> 편집
                        </button>
                        <button onClick={() => { setSelectedSlip(slip); setView("preview"); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-600 hover:bg-gray-100 active:bg-gray-200">
                          <Eye size={12} /> 보기
                        </button>
                        {slip.status === "DRAFT" && (
                          <button onClick={() => handleConfirm(slip.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-green-700 hover:bg-green-50 active:bg-green-100">
                            <CheckCircle2 size={12} /> 확정
                          </button>
                        )}
                        {(slip.status === "CONFIRMED" || slip.status === "SENT") && (
                          <button onClick={() => handleSendKakao(slip.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-yellow-800 hover:bg-yellow-50 active:bg-yellow-100">
                            <Send size={12} /> 전송
                          </button>
                        )}
                        {slip.status === "DRAFT" && (
                          <button onClick={() => handleDelete(slip.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-red-500 hover:bg-red-50 active:bg-red-100 ml-auto">
                            <Trash2 size={12} /> 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSlips.length === 0 && (
                <div className="py-16 text-center">
                  <FileSpreadsheet size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">{filterMonth}월 급여명세서가 없습니다.</p>
                  <button onClick={() => { setView("create"); setBatchMonth(filterMonth); }} className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--brand-blue)] font-medium hover:underline">
                    <Plus size={14} /> 일괄 생성하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   엑셀 양식 기반 급여명세서 편집기
   ════════════════════════════════════════════════════════════════ */

function PayslipEditor({ slip: initialSlip, onSave, onCancel, loading }: {
  slip: any; onSave: (slip: any) => void; onCancel: () => void; loading: boolean;
}) {
  const [slip, setSlip] = useState({ ...initialSlip });

  const updateField = (field: string, value: any) => {
    setSlip((prev: any) => ({ ...prev, [field]: value }));
  };

  const numVal = (v: any) => Number(v || 0);

  const totalPay = numVal(slip.base_salary) + numVal(slip.overtime_pay) + numVal(slip.night_pay)
    + numVal(slip.holiday_pay) + numVal(slip.meal_allowance) + numVal(slip.transport_allowance)
    + numVal(slip.bonus) + numVal(slip.other_pay);

  const totalDeduction = numVal(slip.income_tax) + numVal(slip.local_tax) + numVal(slip.national_pension)
    + numVal(slip.health_insurance) + numVal(slip.long_term_care) + numVal(slip.employment_insurance)
    + numVal(slip.other_deduction);

  const netPay = totalPay - totalDeduction;

  const NumInput = ({ label, field }: { label: string; field: string }) => (
    <div className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
      <label className="text-xs sm:text-sm text-gray-700 font-medium flex-shrink-0">{label}</label>
      <input
        type="number"
        value={slip[field] || 0}
        onChange={e => updateField(field, Number(e.target.value))}
        className="w-24 sm:w-36 text-right px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg outline-none tabular-nums font-mono focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-blue-600 flex-shrink-0" />
            급여명세서 편집
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
            {slip.employee_name} ({slip.employee_no}) · {slip.pay_year_month}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50">
            취소
          </button>
          <button
            onClick={() => onSave({ ...slip, total_pay: totalPay, total_deduction: totalDeduction, net_pay: netPay })}
            disabled={loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#0f1b33] text-white rounded-xl text-sm font-medium hover:bg-[#1a2847] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            저장
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 sm:mb-6">
          {/* 회사 헤더 */}
          <div className="bg-[#0f1b33] text-white p-3 sm:p-4 text-center">
            <h3 className="text-base sm:text-lg font-bold tracking-wide">급 여 명 세 서</h3>
            <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">더웰파트너</p>
          </div>

          {/* 직원 정보 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-200">
            {[
              { label: "성명", value: slip.employee_name },
              { label: "사번", value: slip.employee_no },
              { label: "부서", value: slip.department || "-" },
              { label: "직위", value: slip.position || "-" },
            ].map((item, i) => (
              <div key={i} className="flex border-r last:border-r-0 border-b sm:border-b-0 border-gray-200 last:border-b-0 [&:nth-child(2)]:border-b sm:[&:nth-child(2)]:border-b-0">
                <div className="w-12 sm:w-16 bg-gray-50 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-500 flex items-center">{item.label}</div>
                <div className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 truncate">{item.value}</div>
              </div>
            ))}
          </div>

          {/* 근무 정보 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-200">
            <div className="flex border-r border-b sm:border-b-0 border-gray-200">
              <div className="w-12 sm:w-16 bg-gray-50 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-500 flex items-center">귀속월</div>
              <div className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900">{slip.pay_year_month}</div>
            </div>
            <div className="flex border-b sm:border-b-0 sm:border-r border-gray-200">
              <div className="w-12 sm:w-16 bg-gray-50 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-500 flex items-center">근무일</div>
              <input type="number" value={slip.work_days || 0} onChange={e => updateField("work_days", Number(e.target.value))}
                className="flex-1 w-full min-w-0 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none border-0" />
            </div>
            <div className="flex border-r border-gray-200">
              <div className="w-12 sm:w-16 bg-gray-50 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-500 flex items-center">근무h</div>
              <input type="number" value={slip.work_hours || 0} onChange={e => updateField("work_hours", Number(e.target.value))}
                className="flex-1 w-full min-w-0 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none border-0" />
            </div>
            <div className="flex">
              <div className="w-12 sm:w-16 bg-gray-50 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-500 flex items-center">연장h</div>
              <input type="number" value={slip.overtime_hours || 0} onChange={e => updateField("overtime_hours", Number(e.target.value))}
                className="flex-1 w-full min-w-0 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none border-0" />
            </div>
          </div>

          {/* 지급 / 공제 - 모바일에서 1열, md에서 2열 */}
          <div className="grid md:grid-cols-2 md:divide-x divide-gray-200">
            {/* 지급 항목 */}
            <div>
              <div className="bg-blue-50 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-200">
                <h4 className="text-xs sm:text-sm font-bold text-blue-800">지급 항목</h4>
              </div>
              <div>
                <NumInput label="기본급" field="base_salary" />
                <NumInput label="연장수당" field="overtime_pay" />
                <NumInput label="야간수당" field="night_pay" />
                <NumInput label="휴일수당" field="holiday_pay" />
                <NumInput label="식대" field="meal_allowance" />
                <NumInput label="교통비" field="transport_allowance" />
                <NumInput label="상여금" field="bonus" />
                <NumInput label="기타수당" field="other_pay" />
              </div>
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-50/50 border-t border-gray-200 font-bold text-xs sm:text-sm">
                <span className="text-blue-800">지급 합계</span>
                <span className="font-mono tabular-nums text-blue-700">₩{fmt(totalPay)}</span>
              </div>
            </div>

            {/* 공제 항목 */}
            <div className="border-t md:border-t-0 border-gray-200">
              <div className="bg-red-50 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-200">
                <h4 className="text-xs sm:text-sm font-bold text-red-800">공제 항목</h4>
              </div>
              <div>
                <NumInput label="소득세" field="income_tax" />
                <NumInput label="지방소득세" field="local_tax" />
                <NumInput label="국민연금" field="national_pension" />
                <NumInput label="건강보험" field="health_insurance" />
                <NumInput label="장기요양" field="long_term_care" />
                <NumInput label="고용보험" field="employment_insurance" />
                <NumInput label="기타공제" field="other_deduction" />
                <div className="hidden md:block py-2 px-3 border-b border-gray-100 h-[41px]" />
              </div>
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-red-50/50 border-t border-gray-200 font-bold text-xs sm:text-sm">
                <span className="text-red-800">공제 합계</span>
                <span className="font-mono tabular-nums text-red-700">₩{fmt(totalDeduction)}</span>
              </div>
            </div>
          </div>

          {/* 실수령액 */}
          <div className="bg-[#0f1b33] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <span className="text-sm sm:text-base font-bold">실수령액</span>
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums">₩{fmt(netPay)}</span>
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
          <textarea
            value={slip.memo || ""}
            onChange={e => updateField("memo", e.target.value)}
            rows={2}
            placeholder="참고사항을 입력하세요..."
            className="w-full px-3 sm:px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   급여명세서 미리보기 (인쇄/전송용)
   ════════════════════════════════════════════════════════════════ */

function PayslipPreview({ slip, onClose, onSendKakao, loading }: {
  slip: any; onClose: () => void; onSendKakao: () => void; loading: boolean;
}) {
  const st = statusLabel[slip.status] || statusLabel.DRAFT;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">급여명세서 미리보기</h2>
        <div className="flex gap-2">
          {slip.status !== "DRAFT" && (
            <button
              onClick={onSendKakao}
              disabled={loading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl text-sm font-medium hover:bg-yellow-500 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              카카오톡 전송
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X size={18} /></button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* 헤더 */}
          <div className="bg-[#0f1b33] text-white p-4 sm:p-5 text-center">
            <p className="text-[10px] sm:text-xs text-white/40 mb-0.5 sm:mb-1">더웰파트너</p>
            <h3 className="text-lg sm:text-xl font-bold tracking-widest">급 여 명 세 서</h3>
            <p className="text-xs sm:text-sm text-white/60 mt-0.5 sm:mt-1">{slip.pay_year_month}</p>
          </div>

          {/* 직원 정보 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 text-sm border-b border-gray-200">
            {[
              { l: "성명", v: slip.employee_name },
              { l: "사번", v: slip.employee_no },
              { l: "부서", v: slip.department },
              { l: "직위", v: slip.position },
            ].map((item, i) => (
              <div key={i} className="border-r last:border-r-0 border-b sm:border-b-0 border-gray-200 [&:nth-child(2)]:border-b-0 sm:[&:nth-child(2)]:border-b-0 last:border-b-0">
                <div className="bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-gray-500 font-semibold">{item.l}</div>
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-900 truncate">{item.v || "-"}</div>
              </div>
            ))}
          </div>

          {/* 근무 정보 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 text-sm border-b border-gray-200">
            {[
              { l: "근무일수", v: `${slip.work_days || 0}일` },
              { l: "근무시간", v: `${slip.work_hours || 0}h` },
              { l: "연장시간", v: `${slip.overtime_hours || 0}h` },
              { l: "야간시간", v: `${slip.night_hours || 0}h` },
            ].map((item, i) => (
              <div key={i} className="border-r last:border-r-0 border-b sm:border-b-0 border-gray-200 [&:nth-child(2)]:border-b-0 last:border-b-0">
                <div className="bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-gray-500 font-semibold">{item.l}</div>
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 font-mono tabular-nums text-xs sm:text-sm">{item.v}</div>
              </div>
            ))}
          </div>

          {/* 지급/공제 */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 text-sm">
            <div>
              <div className="bg-blue-50 px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-blue-800 text-[10px] sm:text-xs border-b border-gray-200">지급 항목</div>
              {[
                ["기본급", slip.base_salary], ["연장수당", slip.overtime_pay], ["야간수당", slip.night_pay],
                ["휴일수당", slip.holiday_pay], ["식대", slip.meal_allowance], ["교통비", slip.transport_allowance],
                ["상여금", slip.bonus], ["기타수당", slip.other_pay],
              ].map(([label, val], i) => (
                <div key={i} className="flex justify-between px-2.5 sm:px-4 py-1 sm:py-1.5 border-b border-gray-50">
                  <span className="text-gray-600 text-[11px] sm:text-sm">{label}</span>
                  <span className="font-mono tabular-nums text-[11px] sm:text-sm">{fmt(val)}</span>
                </div>
              ))}
              <div className="flex justify-between px-2.5 sm:px-4 py-2 sm:py-2.5 bg-blue-50/50 font-bold border-t border-gray-200">
                <span className="text-blue-800 text-xs sm:text-sm">합계</span>
                <span className="text-blue-700 font-mono tabular-nums text-xs sm:text-sm">{fmt(slip.total_pay)}</span>
              </div>
            </div>
            <div>
              <div className="bg-red-50 px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-red-800 text-[10px] sm:text-xs border-b border-gray-200">공제 항목</div>
              {[
                ["소득세", slip.income_tax], ["지방소득세", slip.local_tax], ["국민연금", slip.national_pension],
                ["건강보험", slip.health_insurance], ["장기요양", slip.long_term_care], ["고용보험", slip.employment_insurance],
                ["기타공제", slip.other_deduction],
              ].map(([label, val], i) => (
                <div key={i} className="flex justify-between px-2.5 sm:px-4 py-1 sm:py-1.5 border-b border-gray-50">
                  <span className="text-gray-600 text-[11px] sm:text-sm">{label}</span>
                  <span className="font-mono tabular-nums text-red-500 text-[11px] sm:text-sm">{fmt(val)}</span>
                </div>
              ))}
              <div className="h-6 sm:h-[33px] border-b border-gray-50" />
              <div className="flex justify-between px-2.5 sm:px-4 py-2 sm:py-2.5 bg-red-50/50 font-bold border-t border-gray-200">
                <span className="text-red-800 text-xs sm:text-sm">합계</span>
                <span className="text-red-700 font-mono tabular-nums text-xs sm:text-sm">{fmt(slip.total_deduction)}</span>
              </div>
            </div>
          </div>

          {/* 실수령 */}
          <div className="bg-[#0f1b33] text-white px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
            <span className="text-base sm:text-lg font-bold">실수령액</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">₩{fmt(slip.net_pay)}</span>
          </div>
        </div>

        {/* 전송 상태 */}
        {slip.kakao_sent_at && (
          <div className="mt-4 max-w-2xl mx-auto p-3 rounded-xl bg-green-50 border border-green-100 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            <span className="text-green-700">
              카카오톡 전송 완료: {new Date(slip.kakao_sent_at).toLocaleString("ko-KR")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}