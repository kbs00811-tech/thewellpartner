/**
 * 직원용 명세서 보기 페이지 (토큰 기반, 인증 불필요)
 * URL: /payslip/:token
 * 솔라피 SMS/알림톡으로 받은 링크 클릭 시 진입. 모바일 친화 양식.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Loader2, AlertCircle, FileText, Calendar, CreditCard, User } from "lucide-react";
import { payslipApi } from "../lib/api";

type Pay = {
  basic?: number; overtime?: number; night?: number;
  saturday?: number; sat_ot?: number; late?: number;
  meal?: number; transport?: number; annual_leave?: number;
  shift?: number; retirement?: number; subtotal?: number;
};
type Deduct = {
  pension?: number; health?: number; longterm?: number;
  employment?: number; insurance_total?: number;
  income_tax?: number; loan?: number;
};
type AttDay = {
  day: number; basic?: any; overtime?: any; night?: any;
  saturday?: any; sat_ot?: any; late?: any;
};

const fmt = (n?: number) => {
  if (n === undefined || n === null || n === 0) return "0";
  return Math.round(n).toLocaleString("ko-KR");
};

const dow = (year: number, month: number, day: number) => {
  const d = new Date(year, month - 1, day);
  return ["일","월","화","수","목","금","토"][d.getDay()];
};

export default function PayslipView() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setError("유효하지 않은 링크입니다."); setLoading(false); return; }
    payslipApi.getData(token)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "명세서 조회 실패"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-3" />
        <p className="text-sm text-slate-600">명세서 불러오는 중...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">명세서 조회 실패</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <p className="text-xs text-slate-400 mt-3">링크는 발송 후 24시간만 유효합니다.</p>
      </div>
    </div>
  );

  if (!data) return null;
  const soc = data.soc || {};
  const pay: Pay = data.pay || {};
  const deduct: Deduct = data.deduct || {};
  const att: AttDay[] = data.attendance || [];
  const subtotal = pay.subtotal || 0;
  const deductTotal = data.deduct_total || 0;
  const netPay = data.net_pay !== undefined ? data.net_pay : (subtotal - deductTotal);

  // 급여 항목 라벨 (사용자 양식 기준)
  const payItems = [
    { key: "basic", label: "기 본", hours: data.hours?.basic },
    { key: "overtime", label: "연 장", hours: data.hours?.overtime },
    { key: "night", label: "심 야", hours: data.hours?.night },
    { key: "saturday", label: "특 근", hours: data.hours?.saturday },
    { key: "sat_ot", label: "특 잔", hours: data.hours?.sat_ot },
    { key: "late", label: "지각조퇴", hours: data.hours?.late },
    { key: "meal", label: "식대" },
    { key: "transport", label: "교통비" },
    { key: "annual_leave", label: "연차" },
    { key: "shift", label: "원단수당" },
    { key: "retirement", label: "퇴직금" },
  ];
  const deductItems = [
    { key: "pension", label: "국민연금" },
    { key: "health", label: "건강보험" },
    { key: "longterm", label: "장기요양보험" },
    { key: "employment", label: "고용보험" },
    { key: "income_tax", label: "소득세" },
    { key: "loan", label: "가불금" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-3 sm:py-8 sm:px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1 opacity-90">
            <FileText className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-medium">㈜더웰파트너</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">
            {data.year}년 {data.month}월분 급여지급명세서
          </h1>
          <p className="text-sm opacity-90 mt-1">{data.employee_name} 님</p>
        </div>

        {/* 직원 정보 */}
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-3">
            <User className="w-3.5 h-3.5" /> 직원 정보
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-slate-400">성명</dt>
              <dd className="font-semibold text-slate-900">{soc.name || data.employee_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">소속</dt>
              <dd className="font-semibold text-slate-900">더웰파트너</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">시급</dt>
              <dd className="font-semibold text-slate-900">₩{fmt(soc.rate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">입사일</dt>
              <dd className="font-semibold text-slate-900">{soc.hire_date || "-"}</dd>
            </div>
            {soc.resign_date && (
              <div>
                <dt className="text-xs text-slate-400">퇴사일</dt>
                <dd className="font-semibold text-slate-900">{soc.resign_date}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-400">은행</dt>
              <dd className="font-semibold text-slate-900">{soc.bank || "-"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-slate-400">계좌번호</dt>
              <dd className="font-semibold text-slate-900">{soc.account || "-"}</dd>
            </div>
          </dl>
        </div>

        {/* 급여 현황 */}
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-sky-700 mb-3 pb-2 border-b border-sky-200">
            <CreditCard className="w-4 h-4" /> 급여 현황
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {payItems.map((it) => {
                const amount = (pay as any)[it.key] || 0;
                if (amount === 0 && !it.hours) return null;
                return (
                  <tr key={it.key} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-600">{it.label}</td>
                    {it.hours !== undefined && (
                      <td className="py-2 text-xs text-slate-400 text-right">
                        {it.hours > 0 ? `${it.hours}h` : ""}
                      </td>
                    )}
                    <td className="py-2 text-right font-medium text-slate-900">
                      {amount === 0 ? "-" : `₩${fmt(amount)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-sky-50 font-bold">
                <td colSpan={2} className="py-2.5 px-2 text-sky-900">소 계</td>
                <td className="py-2.5 px-2 text-right text-sky-900">₩{fmt(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 공제 현황 */}
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-rose-700 mb-3 pb-2 border-b border-rose-200">
            <CreditCard className="w-4 h-4" /> 공제 현황
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {deductItems.map((it) => {
                const amount = (deduct as any)[it.key] || 0;
                if (amount === 0) return null;
                return (
                  <tr key={it.key} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-600">{it.label}</td>
                    <td className="py-2 text-right font-medium text-slate-900">₩{fmt(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-rose-50 font-bold">
                <td className="py-2.5 px-2 text-rose-900">소 계</td>
                <td className="py-2.5 px-2 text-right text-rose-900">₩{fmt(deductTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 실 수령 금액 */}
        <div className={`p-5 sm:p-6 ${netPay >= 0 ? "bg-lime-50" : "bg-rose-50"} text-center`}>
          <div className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">실 수령 금액</div>
          <div className={`text-3xl sm:text-4xl font-bold ${netPay >= 0 ? "text-lime-700" : "text-rose-700"}`}>
            ₩{fmt(netPay)}
          </div>
        </div>

        {/* 출퇴근 일자별 표 */}
        {att.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-slate-100">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-3">
              <Calendar className="w-3.5 h-3.5" /> 일자별 출퇴근 ({att.length}일)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">일</th>
                    <th className="px-1 py-1.5">요일</th>
                    <th className="px-1 py-1.5 text-right">기본</th>
                    <th className="px-1 py-1.5 text-right">연장</th>
                    <th className="px-1 py-1.5 text-right">심야</th>
                    <th className="px-1 py-1.5 text-right">특근</th>
                    <th className="px-1 py-1.5 text-right">특잔</th>
                    <th className="px-1 py-1.5 text-right">지각</th>
                  </tr>
                </thead>
                <tbody>
                  {att.map((d) => {
                    const w = dow(data.year, data.month, d.day);
                    const isWeekend = w === "토" || w === "일";
                    return (
                      <tr key={d.day} className={`border-b border-slate-50 ${isWeekend ? "bg-rose-50/30" : ""}`}>
                        <td className="px-2 py-1.5 text-slate-700">{d.day}</td>
                        <td className={`px-1 py-1.5 text-center ${isWeekend ? "text-rose-600" : "text-slate-500"}`}>{w}</td>
                        <td className="px-1 py-1.5 text-right">{d.basic ?? "-"}</td>
                        <td className="px-1 py-1.5 text-right">{d.overtime ?? "-"}</td>
                        <td className="px-1 py-1.5 text-right">{d.night ?? "-"}</td>
                        <td className="px-1 py-1.5 text-right">{d.saturday ?? "-"}</td>
                        <td className="px-1 py-1.5 text-right">{d.sat_ot ?? "-"}</td>
                        <td className="px-1 py-1.5 text-right">{d.late ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
          <p>* 본 명세서는 ㈜더웰파트너에서 발송되었습니다.</p>
          <p className="mt-1">발송 후 24시간만 유효합니다.</p>
          {data.data_source && (
            <p className="text-[10px] text-slate-400 mt-2">data: {data.data_source}</p>
          )}
        </div>
      </div>
    </div>
  );
}
