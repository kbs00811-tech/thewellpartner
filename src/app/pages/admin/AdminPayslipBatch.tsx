/**
 * 명세서 발송 (③) — 새 흐름
 *  1. 결과 xlsx 업로드 → 직원 목록 자동 추출
 *  2. 발송 채널 (SMS / LMS / 알림톡) + 대상 직원 선택
 *  3. 솔라피 API로 발송 + 토큰 URL 발급
 *
 *  주의: 솔라피 API 키 (SOLAPI_API_KEY/SECRET/SENDER) 환경변수 등록 후 실제 발송 동작.
 *        등록 전엔 토큰 URL만 발급되고 status='skipped_no_api_key' 반환.
 */
import { useState, useRef, useMemo } from "react";
import { useParams } from "react-router";
import {
  FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Send,
  MessageSquare, MessageCircle, Mail, Phone, Users, ExternalLink,
} from "lucide-react";
import { payslipApi } from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";
import { getCompany } from "../../config/companies";

const today = new Date();

type Employee = {
  no: number;
  name: string;
  phone?: string;
  hire_date?: string;
  resign_date?: string;
  hourly_rate?: number;
  bank?: string;
  account?: string;
};

type SendResult = {
  no: number; name: string; phone?: string; url: string;
  status: string; error?: string | null;
};

export default function AdminPayslipBatch() {
  const { companyId } = useParams();
  const company = companyId ? getCompany(companyId) : undefined;

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [channel, setChannel] = useState<"sms" | "lms" | "alimtalk">("alimtalk");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedNos, setSelectedNos] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [solapiReady, setSolapiReady] = useState<boolean | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const channelLabel = useMemo(() => ({
    sms: "SMS",
    lms: "LMS (장문)",
    alimtalk: "카카오 알림톡",
  } as const), []);

  const handleExcelSelect = async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      handleError(new Error("xlsx 파일만 업로드 가능합니다."));
      return;
    }
    setExcelFile(file);
    setLoading(true);
    setEmployees([]);
    setSelectedNos(new Set());
    setSendResults([]);
    try {
      const { employees } = await payslipApi.listEmployees(file);
      setEmployees(employees);
      const initial = new Set(employees.filter(e => e.phone).map(e => e.no));
      setSelectedNos(initial);
      handleSuccess(`${employees.length}명 직원 정보 추출 완료`);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (no: number) => {
    const next = new Set(selectedNos);
    if (next.has(no)) next.delete(no); else next.add(no);
    setSelectedNos(next);
  };

  const toggleAll = () => {
    const selectable = employees.filter(e => e.phone).map(e => e.no);
    if (selectedNos.size === selectable.length) {
      setSelectedNos(new Set());
    } else {
      setSelectedNos(new Set(selectable));
    }
  };

  const handleSend = async () => {
    if (!excelFile) return;
    if (selectedNos.size === 0) {
      handleError(new Error("발송할 직원을 선택해주세요."));
      return;
    }
    if (!confirm(`${selectedNos.size}명에게 ${channelLabel[channel]}로 명세서 발송하시겠습니까?`)) return;

    setSending(true);
    try {
      const res = await payslipApi.send({
        excel: excelFile, year, month, channel,
        employee_nos: Array.from(selectedNos),
        company_id: company?.id || "lty",
      });
      setSendResults(res.results);
      setSolapiReady(res.solapi_ready);
      if (res.solapi_ready) {
        const sentCount = res.results.filter(r => r.status === "sent").length;
        handleSuccess(`${sentCount}/${res.total}명 발송 완료`);
      } else {
        handleSuccess(`토큰 URL ${res.total}개 발급. 솔라피 API 키 환경변수 등록 후 실제 발송 가능.`);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setSending(false);
    }
  };

  const selectableCount = employees.filter(e => e.phone).length;

  return (
    <div className="space-y-6">
      <div>
        {company && (
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold">
            업체: {company.name}
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900">📨 급여명세서 발송</h1>
        <p className="text-sm text-slate-600 mt-1">
          결과 xlsx 업로드 → 직원별 명세서 링크 SMS/카카오 알림톡 자동 발송
          <span className="text-emerald-700 font-medium ml-1">(솔라피 연동)</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">⚙️ 발송 설정</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="block">
                <span className="text-xs text-slate-600">대상 연도</span>
                <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">대상 월</span>
                <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </label>
            </div>
            <div className="space-y-2 mb-2">
              <span className="text-xs text-slate-600">발송 채널</span>
              {(["alimtalk", "sms", "lms"] as const).map((ch) => (
                <label key={ch} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${
                  channel === ch ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300"
                }`}>
                  <input type="radio" name="channel" value={ch} checked={channel === ch}
                    onChange={() => setChannel(ch)} />
                  {ch === "alimtalk" && <MessageCircle className="w-4 h-4 text-yellow-600" />}
                  {ch === "sms" && <MessageSquare className="w-4 h-4 text-sky-600" />}
                  {ch === "lms" && <Mail className="w-4 h-4 text-slate-600" />}
                  <span className="text-sm font-medium">{channelLabel[ch]}</span>
                  <span className="text-xs text-slate-500 ml-auto">
                    {ch === "alimtalk" ? "8.5원" : ch === "sms" ? "9원" : "30원"}/건
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 알림톡은 사업자 인증 + 템플릿 사전 승인 필요. 인증 전엔 SMS로 발송됩니다.
            </p>
          </div>

          <div onClick={() => excelInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleExcelSelect(f); }}
            className={`border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${
              excelFile ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-sky-400 bg-white"
            }`}>
            <input ref={excelInputRef} type="file" accept=".xlsx" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleExcelSelect(e.target.files[0])} />
            <div className="flex flex-col items-center text-center">
              <FileSpreadsheet className={`w-10 h-10 mb-2 ${excelFile ? "text-emerald-600" : "text-slate-400"}`} />
              <div className="font-medium text-slate-900 text-sm">📊 지급파일 업로드</div>
              {excelFile ? (
                <div className="mt-1 text-xs text-emerald-700">{excelFile.name}</div>
              ) : (
                <div className="mt-1 text-xs text-slate-500">① 근태 자동입력 결과 파일</div>
              )}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={!excelFile || selectedNos.size === 0 || sending}
            className="w-full py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? <><Loader2 className="w-5 h-5 animate-spin" /> 발송 중...</> :
              <><Send className="w-5 h-5" /> {selectedNos.size}명에게 발송</>}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              직원 목록 분석 중...
            </div>
          )}

          {employees.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">발송 대상 ({selectedNos.size}/{selectableCount}명)</h3>
                </div>
                <button onClick={toggleAll} className="text-xs text-sky-600 hover:underline">
                  {selectedNos.size === selectableCount ? "전체 해제" : "전체 선택"}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {employees.map((emp) => {
                  const hasPhone = !!emp.phone;
                  const selected = selectedNos.has(emp.no);
                  return (
                    <label key={emp.no}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 ${
                        hasPhone ? "cursor-pointer hover:bg-slate-50" : "opacity-60"
                      }`}>
                      <input type="checkbox" disabled={!hasPhone} checked={selected}
                        onChange={() => toggleEmployee(emp.no)} className="rounded" />
                      <span className="text-xs text-slate-400 w-6">{emp.no}</span>
                      <span className="font-medium text-sm text-slate-900 flex-1">{emp.name}</span>
                      <span className={`text-xs flex items-center gap-1 ${hasPhone ? "text-slate-600" : "text-amber-600"}`}>
                        <Phone className="w-3 h-3" />
                        {emp.phone || "연락처 없음"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {sendResults.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {solapiReady ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                    <AlertCircle className="w-5 h-5 text-amber-600" />}
                  <h3 className="font-semibold text-slate-900">발송 결과</h3>
                </div>
                {!solapiReady && (
                  <span className="text-xs text-amber-600">솔라피 API 키 미설정 — URL만 발급</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {sendResults.map((r) => (
                  <div key={r.no} className="px-4 py-2.5 border-b border-slate-50 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{r.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                        r.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {r.status === "sent" ? "발송 완료" :
                         r.status === "failed" ? "실패" :
                         r.status === "skipped_no_api_key" ? "URL 발급만" : r.status}
                      </span>
                    </div>
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {r.url}
                    </a>
                    {r.error && <div className="text-xs text-red-600 mt-1">{r.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
