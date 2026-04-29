/**
 * 더미 데이터 정리 + 시스템 점검
 *
 * 기능:
 *   1. 모든 테이블의 데이터 카운트 표시
 *   2. 테이블별 선택 삭제 (체크박스)
 *   3. Dry-run 모드 (실제 삭제 전 확인)
 *   4. 감사 로그 자동 기록
 *
 * 보안:
 *   - admin/admin1234 + SUPER_ADMIN 역할 + 시스템 설정 자동 보호
 *   - 화이트리스트 테이블만 삭제 가능
 */
import { useState, useEffect } from "react";
import { Database, Trash2, AlertTriangle, RefreshCw, CheckCircle2, Loader2, Eye, ShieldAlert } from "lucide-react";
import * as api from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

const TABLE_INFO: Record<string, { label: string; category: string; danger?: boolean }> = {
  site_banners: { label: "홈페이지 배너", category: "웹사이트" },
  notices: { label: "공지사항", category: "웹사이트" },
  faqs: { label: "FAQ", category: "웹사이트" },
  materials: { label: "자료실", category: "웹사이트" },
  job_posts: { label: "채용공고", category: "채용" },
  job_applications: { label: "채용 지원서", category: "채용" },
  applicants: { label: "지원자", category: "채용" },
  inquiries: { label: "문의", category: "고객" },
  inquiry_memos: { label: "문의 메모", category: "고객" },
  employees: { label: "직원", category: "인력", danger: true },
  departments: { label: "부서", category: "인력" },
  positions: { label: "직급", category: "인력" },
  client_companies: { label: "고객사", category: "ERP", danger: true },
  work_sites: { label: "현장", category: "ERP" },
  placements: { label: "배치", category: "ERP" },
  attendance_records: { label: "근태 기록", category: "ERP" },
  payroll_documents: { label: "급여명세서", category: "ERP", danger: true },
  issued_documents: { label: "발급 서류", category: "서류" },
  document_templates: { label: "서류 템플릿", category: "서류" },
  billing_rates: { label: "단가 마스터", category: "정산" },
  partner_billings: { label: "고객사 청구서", category: "정산", danger: true },
  settlements: { label: "정산 내역", category: "정산", danger: true },
  visas: { label: "비자", category: "외국인" },
  stay_records: { label: "체류 기록", category: "외국인" },
  verification_requests: { label: "인증 요청", category: "시스템" },
  audit_logs: { label: "감사 로그", category: "시스템" },
  email_logs: { label: "이메일 로그", category: "시스템" },
};

export default function AdminDataCleanup() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmText, setConfirmText] = useState("");

  const loadStats = async () => {
    setLoading(true);
    try {
      const res: any = await api.dataCleanupApi.getStats();
      setStats(res.stats || {});
    } catch (e: any) {
      handleError(e, { fallback: "통계 조회 실패" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const totalRecords = Object.values(stats).reduce((s, n) => s + n, 0);
  const tablesWithData = Object.entries(stats).filter(([_, n]) => n > 0);

  const toggle = (table: string) => {
    const next = new Set(selected);
    if (next.has(table)) next.delete(table); else next.add(table);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === tablesWithData.length) setSelected(new Set());
    else setSelected(new Set(tablesWithData.map(([t]) => t)));
  };

  const handleDryRun = async () => {
    if (selected.size === 0) {
      handleError(new Error("삭제할 테이블을 선택해주세요."));
      return;
    }
    setExecuting(true);
    try {
      const res: any = await api.dataCleanupApi.cleanup({
        tables: Array.from(selected),
        dryRun: true,
      });
      const total = Object.values(res.result || {}).reduce((s: number, r: any) => s + r.count, 0);
      handleSuccess(`Dry-run 완료: ${total}건 삭제 예정 (실제 삭제 안 됨)`);
    } catch (e: any) {
      handleError(e, { fallback: "Dry-run 실패" });
    } finally { setExecuting(false); }
  };

  const handleExecute = async () => {
    if (selected.size === 0) {
      handleError(new Error("삭제할 테이블을 선택해주세요."));
      return;
    }
    if (confirmText !== "DELETE") {
      handleError(new Error("'DELETE'를 정확히 입력해주세요."));
      return;
    }
    setExecuting(true);
    try {
      const res: any = await api.dataCleanupApi.cleanup({
        tables: Array.from(selected),
        dryRun: false,
      });
      const total = Object.values(res.result || {}).reduce((s: number, r: any) => s + r.deleted.length, 0);
      handleSuccess(`${total}건 데이터 삭제 완료`);
      setSelected(new Set());
      setConfirmText("");
      loadStats();
    } catch (e: any) {
      handleError(e, { fallback: "삭제 실패" });
    } finally { setExecuting(false); }
  };

  // 카테고리별 그룹화
  const byCategory: Record<string, Array<[string, number]>> = {};
  for (const [table, count] of tablesWithData) {
    const info = TABLE_INFO[table];
    if (!info) continue;
    if (!byCategory[info.category]) byCategory[info.category] = [];
    byCategory[info.category].push([table, count]);
  }

  const selectedCount = Array.from(selected).reduce((s, t) => s + (stats[t] || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-navy)] flex items-center gap-2">
          <Database size={22} /> 데이터 정리 + 시스템 점검
        </h1>
        <p className="text-sm text-gray-500 mt-1">시드 더미 데이터를 안전하게 삭제하고 운영 데이터만 남깁니다.</p>
      </div>

      {/* 경고 배너 */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <ShieldAlert size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-bold text-red-700 mb-1">위험한 작업입니다</div>
          <ul className="text-red-600 space-y-0.5 text-xs list-disc list-inside">
            <li>삭제된 데이터는 <strong>복구 불가능</strong>합니다 (백업 권장)</li>
            <li>관리자 계정 (admin), 권한, 시스템 설정은 <strong>자동 보호</strong>됩니다</li>
            <li>실행 전 <strong>Dry-run</strong>으로 확인하세요</li>
            <li>실수 방지: 'DELETE' 입력 후 실행 가능</li>
          </ul>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">전체 데이터</div>
          <div className="text-xl font-bold text-[var(--brand-navy)]">{totalRecords.toLocaleString()}건</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">데이터 있는 테이블</div>
          <div className="text-xl font-bold text-[var(--brand-navy)]">{tablesWithData.length}개</div>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
          <div className="text-xs text-gray-500 mb-1">선택된 테이블</div>
          <div className="text-xl font-bold text-orange-600">{selected.size}개</div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="text-xs text-gray-500 mb-1">삭제 예정</div>
          <div className="text-xl font-bold text-red-600">{selectedCount.toLocaleString()}건</div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={loadStats} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 새로고침
        </button>
        <button onClick={toggleAll} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
          <CheckCircle2 size={14} /> {selected.size === tablesWithData.length ? "전체 해제" : "전체 선택"}
        </button>
        <button onClick={handleDryRun} disabled={executing || selected.size === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
          {executing ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
          Dry-run (안전 미리보기)
        </button>
      </div>

      {/* 테이블 목록 (카테고리별) */}
      <div className="space-y-4 mb-6">
        {Object.entries(byCategory).map(([category, tables]) => (
          <div key={category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 font-bold text-sm text-[var(--brand-navy)] border-b border-gray-100">
              {category} ({tables.length}개)
            </div>
            <div className="divide-y divide-gray-50">
              {tables.map(([table, count]) => {
                const info = TABLE_INFO[table];
                const isSelected = selected.has(table);
                return (
                  <label key={table} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50/30 transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(table)} className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--brand-navy)] flex items-center gap-2">
                        {info?.label || table}
                        {info?.danger && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">중요</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{table}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[var(--brand-navy)]">{count.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">건</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 실행 영역 */}
      {selected.size > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 sticky bottom-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="font-bold text-red-700 mb-1">
                {selected.size}개 테이블 / {selectedCount.toLocaleString()}건 데이터를 영구 삭제합니다
              </div>
              <p className="text-xs text-red-600">
                관리자 계정과 시스템 설정은 보호됩니다. 백업을 먼저 받으셨는지 확인하세요.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="DELETE 라고 입력하세요"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-red-200 text-sm font-mono focus:border-red-500 focus:outline-none"
            />
            <button
              onClick={handleExecute}
              disabled={executing || confirmText !== "DELETE"}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50 hover:bg-red-700"
            >
              {executing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              영구 삭제 실행
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
