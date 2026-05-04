/**
 * 출근부 자동 입력 (PDF → 근태/연차)
 *
 * Python FastAPI 백엔드(openpyxl 기반)로 처리하여 수식/서식 100% 보존.
 * 백엔드: backend-api/ (Render Free Tier 배포)
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, FileSpreadsheet, Download, Loader2,
  CheckCircle2, AlertCircle, ArrowRight, Wifi, WifiOff,
} from "lucide-react";
import { attendanceApi, AttendanceProcessResult } from "../../lib/api";
import { handleError, handleSuccess } from "../../lib/error-handler";

const today = new Date();

export default function AdminAttendanceImport() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AttendanceProcessResult | null>(null);
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [serverAlive, setServerAlive] = useState<boolean | null>(null);
  const [pinging, setPinging] = useState(false);

  // 설정
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [holidays, setHolidays] = useState("");
  const [standardHours, setStandardHours] = useState(209);
  const [normalStart, setNormalStart] = useState("08:30");
  const [normalEnd, setNormalEnd] = useState("17:30");
  const [sheetName, setSheetName] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // 페이지 진입 시 서버 ping (콜드 스타트 미리 깨우기)
  useEffect(() => {
    setPinging(true);
    attendanceApi.ping().then((ok) => {
      setServerAlive(ok);
      setPinging(false);
    });
  }, []);

  const log = useCallback((msg: string) => {
    setProgress((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const handlePdfSelect = (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      handleError(new Error("PDF 파일만 업로드 가능합니다."));
      return;
    }
    setPdfFile(file);
  };

  const handleExcelSelect = (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      handleError(new Error("xlsx 파일만 업로드 가능합니다."));
      return;
    }
    setExcelFile(file);
  };

  const handleProcess = async () => {
    if (!pdfFile || !excelFile) {
      handleError(new Error("PDF와 Excel 파일을 모두 업로드하세요."));
      return;
    }

    setProcessing(true);
    setProgress([]);
    setResult(null);
    setResultBlob(null);

    try {
      log("📤 파일 업로드 중...");
      log("⚙️ Python 백엔드 처리 중 (수식 보존 엔진)...");
      if (serverAlive === false || pinging) {
        log("⏰ 서버 콜드 스타트 — 첫 요청은 30~60초 소요될 수 있습니다");
      }

      const startTime = Date.now();
      const { blob, filename, summary } = await attendanceApi.process({
        pdf: pdfFile,
        excel: excelFile,
        year,
        month,
        holidays,
        standardHours,
        normalStart,
        normalEnd,
        sheetName: sheetName.trim() || undefined,
        overwriteExisting,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log(`✅ 처리 완료 (${elapsed}초)`);
      log(`📊 PDF: ${summary.pdf_meta.total_employees}명 인식`);
      log(`📊 근태 입력: ${summary.attendance.filled_employees}명 / ${summary.attendance.total_cells}셀`);
      log(`📊 연차 입력: ${summary.leave.filled_employees}명`);
      log(`🛡 수식 보존: ${summary.validation_ok ? "✅ OK" : "⚠️ 확인 필요"}`);
      log(`   원본 ${summary.validation["원본_수식_개수"] || 0} → 결과 ${summary.validation["결과_수식_개수"] || 0}`);

      if (summary.attendance.missing.length > 0) {
        log(`⚠️ 매칭 실패: ${summary.attendance.missing.join(", ")}`);
      }

      setResult(summary);
      setResultBlob({ blob, filename });
      handleSuccess(`자동 입력 완료. 검토리스트와 검증 결과를 확인하세요.`);
    } catch (err: any) {
      log(`❌ 오류: ${err.message}`);
      handleError(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultBlob.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleSuccess("다운로드 시작");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📋 출근부 자동 입력</h1>
        <p className="text-sm text-slate-600 mt-1">
          PDF 출근부와 청구 엑셀을 업로드하면 근태/연차 시트에 자동 입력됩니다.
          <span className="text-emerald-700 font-medium ml-1">수식·서식 100% 보존</span>
        </p>
      </div>

      {/* 서버 상태 */}
      <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
        serverAlive === true
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
          : serverAlive === false
            ? "bg-amber-50 text-amber-800 border border-amber-200"
            : "bg-slate-50 text-slate-700 border border-slate-200"
      }`}>
        {pinging ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>처리 서버 깨우는 중...</span>
          </>
        ) : serverAlive ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>처리 서버 연결됨</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>처리 서버 응답 없음. 첫 요청 시 30~60초 깨어나는 시간이 필요할 수 있습니다.</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 설정 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">⚙️ 처리 설정</h3>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-xs text-slate-600">대상 연도</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">대상 월</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
            </div>

            <label className="block mb-3">
              <span className="text-xs text-slate-600">근태 시트명 (비우면 자동감지)</span>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="예: 근태 ( 5월 )"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="block mb-3">
              <span className="text-xs text-slate-600">월 기준시간</span>
              <input
                type="number"
                value={standardHours}
                onChange={(e) => setStandardHours(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-xs text-slate-600">정상 출근</span>
                <input
                  type="text"
                  value={normalStart}
                  onChange={(e) => setNormalStart(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">정상 퇴근</span>
                <input
                  type="text"
                  value={normalEnd}
                  onChange={(e) => setNormalEnd(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
            </div>

            <label className="block mb-3">
              <span className="text-xs text-slate-600">공휴일 (한 줄에 하나)</span>
              <textarea
                value={holidays}
                onChange={(e) => setHolidays(e.target.value)}
                rows={3}
                placeholder="2026-05-05 어린이날&#10;2026-05-25 부처님오신날 대체공휴일"
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded"
              />
              기존 값 덮어쓰기
            </label>
          </div>
        </div>

        {/* 우측: 파일 업로드 + 실행 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PDF */}
            <div
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handlePdfSelect(f);
              }}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${
                pdfFile
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-300 hover:border-sky-400 bg-white"
              }`}
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePdfSelect(e.target.files[0])}
              />
              <div className="flex flex-col items-center text-center">
                <FileText className={`w-10 h-10 mb-2 ${pdfFile ? "text-emerald-600" : "text-slate-400"}`} />
                <div className="font-medium text-slate-900 text-sm">📄 PDF 출근부</div>
                {pdfFile ? (
                  <div className="mt-1 text-xs text-emerald-700">{pdfFile.name}</div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">드래그하거나 클릭</div>
                )}
              </div>
            </div>

            {/* Excel */}
            <div
              onClick={() => excelInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleExcelSelect(f);
              }}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${
                excelFile
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-300 hover:border-sky-400 bg-white"
              }`}
            >
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleExcelSelect(e.target.files[0])}
              />
              <div className="flex flex-col items-center text-center">
                <FileSpreadsheet className={`w-10 h-10 mb-2 ${excelFile ? "text-emerald-600" : "text-slate-400"}`} />
                <div className="font-medium text-slate-900 text-sm">📊 청구 엑셀</div>
                {excelFile ? (
                  <div className="mt-1 text-xs text-emerald-700">{excelFile.name}</div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">드래그하거나 클릭</div>
                )}
              </div>
            </div>
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={handleProcess}
            disabled={!pdfFile || !excelFile || processing}
            className="w-full py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                🚀 근태 + 연차 자동 입력 실행
              </>
            )}
          </button>

          {/* 진행 로그 */}
          {progress.length > 0 && (
            <div className="bg-slate-900 text-emerald-300 rounded-xl p-4 font-mono text-xs max-h-60 overflow-auto">
              {progress.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          {/* 결과 */}
          {result && resultBlob && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start gap-3">
                {result.validation_ok ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">처리 결과</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {result.validation_ok
                      ? "수식·서식이 100% 보존되었습니다."
                      : "수식 일부에 변경이 감지되었습니다. 검토리스트를 확인하세요."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">PDF 직원</div>
                  <div className="text-xl font-bold text-slate-900">{result.pdf_meta.total_employees}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">근태 입력</div>
                  <div className="text-xl font-bold text-slate-900">{result.attendance.filled_employees}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">연차 입력</div>
                  <div className="text-xl font-bold text-slate-900">{result.leave.filled_employees}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">매칭 실패</div>
                  <div className="text-xl font-bold text-slate-900">
                    {result.attendance.missing.length}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                <div>원본 수식: <strong>{result.validation["원본_수식_개수"]}</strong>개 → 결과 수식: <strong>{result.validation["결과_수식_개수"]}</strong>개</div>
                <div>수식 손실: <strong>{result.validation["수식_손실"]}</strong>개 / 수식 변경: <strong>{result.validation["수식_변경"]}</strong>개</div>
                <div>병합셀 변경: <strong>{result.validation["병합셀_변경된_시트"]}</strong>개 시트</div>
                {result.review_count > 0 && (
                  <div>검토 항목: <strong>{result.review_count}</strong>건 (다운로드 파일의 <code>자동입력_검토리스트</code> 시트 확인)</div>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                완성 엑셀 다운로드 ({resultBlob.filename})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
