/**
 * 직원용 명세서 보기 페이지 (토큰 기반, 인증 불필요)
 * URL: /payslip/:token
 * 솔라피 SMS/알림톡으로 받은 링크 클릭 시 진입.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { payslipApi } from "../lib/api";

export default function PayslipView() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("유효하지 않은 링크입니다.");
      setLoading(false);
      return;
    }
    payslipApi.getData(token)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "명세서 조회 실패"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600">명세서 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">명세서 조회 실패</h1>
          <p className="text-sm text-slate-600">{error}</p>
          <p className="text-xs text-slate-400 mt-3">링크는 발송 후 24시간만 유효합니다.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const soc = data.soc || {};

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">㈜더웰파트너</span>
          </div>
          <h1 className="text-2xl font-bold">
            {data.year}년 {data.month}월분 급여명세서
          </h1>
          <p className="text-sm opacity-90 mt-1">{data.employee_name} 님</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">성명</div>
              <div className="font-medium">{soc.name || data.employee_name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">소속</div>
              <div className="font-medium">더웰파트너</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">시급</div>
              <div className="font-medium">{soc.rate ? `₩${soc.rate.toLocaleString()}` : "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">입사일</div>
              <div className="font-medium">{soc.hire_date || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">은행</div>
              <div className="font-medium">{soc.bank || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">계좌번호</div>
              <div className="font-medium">{soc.account || "-"}</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <p className="font-semibold mb-1">⚠️ 명세서 상세 데이터 (개발 중)</p>
            <p className="text-xs leading-relaxed">
              급여/공제 내역 표시 기능은 다음 업데이트에서 추가됩니다.
              현재는 직원 기본 정보만 확인 가능합니다.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-500">
          본 명세서는 발송 후 24시간만 유효합니다.
        </div>
      </div>
    </div>
  );
}
