/**
 * 도급/파견 양식 HTML 템플릿 생성기
 * - 계약 형태별 분기 (인적/생산/파견)
 * - A4 인쇄 최적화 (794×1123px @ 96dpi)
 * - 한국 표준 양식 (흑백 + 빨강 직인)
 */
import type { ContractData, InvoiceData, TaxInvoiceData, PayslipData, CompanyInfo, ClientInfo } from "./types";
import { CONTRACT_TYPE_LABEL } from "./types";

const CSS_BASE = `
  font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
  width: 794px; min-height: 1123px;
  background: #fff; color: #1a1a1a;
  padding: 60px 70px; box-sizing: border-box;
  position: relative;
`;

const SEAL_HTML = (companyName: string, sealUrl?: string) => {
  // 절대 URL로 변환 (html2canvas CORS 우회)
  const url = sealUrl || "/seal.png";
  const absUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  return `<img src="${absUrl}" alt="직인" crossorigin="anonymous" style="width:90px;height:90px;object-fit:contain;display:inline-block;" onerror="this.style.display='none';this.parentNode.innerHTML+='<div style=\\'display:inline-block;width:80px;height:80px;border:3px solid #DC2626;border-radius:50%;position:relative;\\'><div style=\\'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;\\'><div style=\\'font-size:9px;font-weight:800;color:#DC2626;\\'>주식회사</div><div style=\\'font-size:11px;font-weight:900;color:#DC2626;\\'>${companyName.replace("주식회사 ", "").replace("(주)", "")}</div><div style=\\'font-size:8px;color:#DC2626;\\'>대표이사인</div></div></div>'" />`;
};

const formatNumber = (n: number) => (n || 0).toLocaleString("ko-KR");

// ────────────────────────────────────────
// 1. 계약서 (3종)
// ────────────────────────────────────────

export function renderContract(data: ContractData, company: CompanyInfo, client: ClientInfo): string {
  const typeLabel = CONTRACT_TYPE_LABEL[data.contractType];
  let detailsHtml = "";

  if (data.contractType === "PERSONAL_OUTSOURCING" && data.personalDetails) {
    const p = data.personalDetails;
    detailsHtml = `
      <div style="margin-top:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;">제3조 (도급 업무 및 인력)</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;width:30%;">투입 인원</td><td style="border:1px solid #333;padding:8px 12px;">${p.headcount}명</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">근로 시간</td><td style="border:1px solid #333;padding:8px 12px;">일 ${p.workHoursPerDay}시간 / 주 ${p.workDaysPerWeek}일</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">현장 책임자 (도급사 측)</td><td style="border:1px solid #333;padding:8px 12px;">${p.siteManager}</td></tr>
        </table>
        <div style="font-size:13px;margin-top:10px;color:#475569;">
          ※ 본 계약의 업무 수행에 관한 모든 지휘·명령권은 ${company.name}(이하 "을")에게 있으며, "갑"은 직접 지시할 수 없습니다.
        </div>
        ${p.rateTable.length > 0 ? `
          <div style="font-size:13px;font-weight:700;margin-top:15px;margin-bottom:5px;">[별표 1] 도급금액 산정표</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="background:#F8FAFC;"><th style="border:1px solid #333;padding:6px;">직무</th><th style="border:1px solid #333;padding:6px;">시간당 단가</th><th style="border:1px solid #333;padding:6px;">투입 인원</th></tr>
            ${p.rateTable.map(r => `<tr><td style="border:1px solid #333;padding:6px;text-align:center;">${r.jobCategory}</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(r.ratePerHour)}원</td><td style="border:1px solid #333;padding:6px;text-align:center;">${r.headcount}명</td></tr>`).join("")}
          </table>
        ` : ""}
      </div>
    `;
  } else if (data.contractType === "PRODUCTION_OUTSOURCING" && data.productionDetails) {
    const p = data.productionDetails;
    detailsHtml = `
      <div style="margin-top:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;">제3조 (생산 도급 내용)</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;width:30%;">생산 제품</td><td style="border:1px solid #333;padding:8px 12px;">${p.productName}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">목표 수량</td><td style="border:1px solid #333;padding:8px 12px;">${formatNumber(p.targetQuantity)}개</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">품질 기준</td><td style="border:1px solid #333;padding:8px 12px;">${p.qualityStandard}</td></tr>
        </table>
        ${p.rateTable.length > 0 ? `
          <div style="font-size:13px;font-weight:700;margin-top:15px;margin-bottom:5px;">[별표 1] 단가표</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="background:#F8FAFC;"><th style="border:1px solid #333;padding:6px;">규격/사양</th><th style="border:1px solid #333;padding:6px;">단가 (개당)</th><th style="border:1px solid #333;padding:6px;">예상 수량</th></tr>
            ${p.rateTable.map(r => `<tr><td style="border:1px solid #333;padding:6px;">${r.productSpec}</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(r.unitRate)}원</td><td style="border:1px solid #333;padding:6px;text-align:center;">${r.quantity || "-"}</td></tr>`).join("")}
          </table>
        ` : ""}
      </div>
    `;
  } else if (data.contractType === "DISPATCH" && data.dispatchDetails) {
    const d = data.dispatchDetails;
    detailsHtml = `
      <div style="margin-top:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;">제3조 (파견근로자보호 등에 관한 법률 제20조 의무 기재사항)</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;width:30%;">파견 기간</td><td style="border:1px solid #333;padding:8px 12px;">${d.dispatchPeriod}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">시업·종업 시각</td><td style="border:1px solid #333;padding:8px 12px;">${d.workTime}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">휴게시간</td><td style="border:1px solid #333;padding:8px 12px;">${d.restTime}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">휴일</td><td style="border:1px solid #333;padding:8px 12px;">${d.holiday}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">사용사업주</td><td style="border:1px solid #333;padding:8px 12px;">${d.userBusinessName} / 관리자: ${d.userManagerName}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">안전보건책임자</td><td style="border:1px solid #333;padding:8px 12px;">${d.safetyManager}</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">파견수수료 (월)</td><td style="border:1px solid #333;padding:8px 12px;">${formatNumber(d.dispatchFee)}원</td></tr>
          <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">파견근로자 임금 (월)</td><td style="border:1px solid #333;padding:8px 12px;">${formatNumber(d.workerWage)}원</td></tr>
        </table>
      </div>
    `;
  }

  return `
    <div id="cert-render" style="${CSS_BASE}">
      <div style="text-align:right;font-size:11px;color:#64748B;margin-bottom:20px;">계약번호: ${data.contractNo}</div>
      <h1 style="text-align:center;font-size:28px;font-weight:800;letter-spacing:8px;margin:20px 0 30px;">${typeLabel} 계약서</h1>

      <div style="font-size:13px;line-height:1.8;margin-bottom:20px;">
        <strong>${client.name}</strong> (이하 "갑")과 <strong>${company.name}</strong> (이하 "을")은 다음과 같이 ${typeLabel} 계약을 체결한다.
      </div>

      <div style="font-size:14px;font-weight:700;margin-top:20px;margin-bottom:10px;">제1조 (계약 당사자)</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr style="background:#F8FAFC;"><th style="border:1px solid #333;padding:6px;width:8%;">구분</th><th style="border:1px solid #333;padding:6px;width:20%;">상호</th><th style="border:1px solid #333;padding:6px;width:18%;">대표자</th><th style="border:1px solid #333;padding:6px;width:18%;">사업자등록번호</th><th style="border:1px solid #333;padding:6px;">주소</th></tr>
        <tr><td style="border:1px solid #333;padding:6px;text-align:center;font-weight:700;">갑</td><td style="border:1px solid #333;padding:6px;">${client.name}</td><td style="border:1px solid #333;padding:6px;">${client.ceoName}</td><td style="border:1px solid #333;padding:6px;">${client.businessNo}</td><td style="border:1px solid #333;padding:6px;font-size:11px;">${client.address}</td></tr>
        <tr><td style="border:1px solid #333;padding:6px;text-align:center;font-weight:700;">을</td><td style="border:1px solid #333;padding:6px;">${company.name}</td><td style="border:1px solid #333;padding:6px;">${company.ceoName}</td><td style="border:1px solid #333;padding:6px;">${company.businessNo}</td><td style="border:1px solid #333;padding:6px;font-size:11px;">${company.address}</td></tr>
      </table>

      <div style="font-size:14px;font-weight:700;margin-top:20px;margin-bottom:10px;">제2조 (계약 기간 및 장소)</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;width:30%;">계약 기간</td><td style="border:1px solid #333;padding:8px 12px;">${data.startDate} ~ ${data.endDate}</td></tr>
        <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">작업 장소</td><td style="border:1px solid #333;padding:8px 12px;">${data.workSite}</td></tr>
        <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">업무 내용</td><td style="border:1px solid #333;padding:8px 12px;">${data.workDescription}</td></tr>
        <tr><td style="border:1px solid #333;padding:8px 12px;background:#F8FAFC;">대금 지급</td><td style="border:1px solid #333;padding:8px 12px;">${data.paymentTerm}</td></tr>
      </table>

      ${detailsHtml}

      <div style="font-size:14px;font-weight:700;margin-top:20px;margin-bottom:10px;">제4조 (기타 사항)</div>
      <div style="font-size:12px;line-height:1.7;color:#475569;">
        본 계약에 명시되지 아니한 사항은 일반 상관례 및 관계 법령에 따르며, 분쟁 발생 시 ${company.name} 본사 소재지 관할 법원을 합의관할로 한다.
      </div>

      <div style="text-align:center;margin-top:50px;font-size:14px;font-weight:700;">${data.contractDate}</div>

      <div style="display:flex;justify-content:space-around;margin-top:40px;">
        <div style="text-align:center;">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px;">갑</div>
          <div style="font-size:13px;">${client.name}</div>
          <div style="font-size:13px;margin-bottom:10px;">대표이사 ${client.ceoName} <span style="border:1px solid #ccc;padding:2px 6px;font-size:10px;color:#aaa;">(인)</span></div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px;">을</div>
          <div style="font-size:13px;">${company.name}</div>
          <div style="font-size:13px;margin-bottom:10px;">대표이사 ${company.ceoName}</div>
          ${SEAL_HTML(company.name, company.sealUrl)}
        </div>
      </div>
    </div>
  `;
}

// ────────────────────────────────────────
// 2. 청구서/거래명세서
// ────────────────────────────────────────

export function renderInvoice(data: InvoiceData, company: CompanyInfo, client: ClientInfo): string {
  const typeLabel = CONTRACT_TYPE_LABEL[data.contractType];

  return `
    <div id="cert-render" style="${CSS_BASE}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;">
        <div>
          <h1 style="font-size:32px;font-weight:800;letter-spacing:6px;margin:0;">청 구 서</h1>
          <div style="font-size:11px;color:#64748B;margin-top:5px;">${typeLabel}</div>
        </div>
        <div style="text-align:right;font-size:11px;color:#64748B;">
          <div>청구번호: ${data.invoiceNo}</div>
          <div>발행일자: ${data.invoiceDate}</div>
          <div>지급기일: ${data.dueDate}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
        <tr>
          <td style="border:2px solid #1E293B;padding:10px;width:50%;vertical-align:top;">
            <div style="font-size:11px;color:#64748B;margin-bottom:3px;">공 급 자</div>
            <div style="font-weight:700;font-size:14px;">${company.name}</div>
            <div style="margin-top:6px;font-size:11px;line-height:1.6;">
              대표자: ${company.ceoName}<br/>
              사업자: ${company.businessNo}<br/>
              ${company.address}<br/>
              TEL: ${company.phone}
            </div>
          </td>
          <td style="border:2px solid #1E293B;padding:10px;width:50%;vertical-align:top;">
            <div style="font-size:11px;color:#64748B;margin-bottom:3px;">공급받는자 (수신)</div>
            <div style="font-weight:700;font-size:14px;">${client.name} 귀중</div>
            <div style="margin-top:6px;font-size:11px;line-height:1.6;">
              대표자: ${client.ceoName}<br/>
              사업자: ${client.businessNo}<br/>
              ${client.address}
            </div>
          </td>
        </tr>
      </table>

      <div style="font-size:13px;margin-bottom:8px;">
        <strong>${data.yearMonth}</strong> ${typeLabel} 용역에 대한 대금을 다음과 같이 청구합니다.
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#1E293B;color:#fff;">
            <th style="border:1px solid #1E293B;padding:8px;width:5%;">No.</th>
            <th style="border:1px solid #1E293B;padding:8px;">품목</th>
            ${data.items.some(i => i.spec) ? '<th style="border:1px solid #1E293B;padding:8px;width:12%;">규격</th>' : ''}
            <th style="border:1px solid #1E293B;padding:8px;width:10%;">수량</th>
            <th style="border:1px solid #1E293B;padding:8px;width:8%;">단위</th>
            <th style="border:1px solid #1E293B;padding:8px;width:14%;">단가</th>
            <th style="border:1px solid #1E293B;padding:8px;width:18%;">금액</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, i) => `
            <tr>
              <td style="border:1px solid #333;padding:8px;text-align:center;">${i + 1}</td>
              <td style="border:1px solid #333;padding:8px;">${item.description}</td>
              ${data.items.some(it => it.spec) ? `<td style="border:1px solid #333;padding:8px;text-align:center;">${item.spec || "-"}</td>` : ''}
              <td style="border:1px solid #333;padding:8px;text-align:right;">${formatNumber(item.quantity)}</td>
              <td style="border:1px solid #333;padding:8px;text-align:center;">${item.unit}</td>
              <td style="border:1px solid #333;padding:8px;text-align:right;">${formatNumber(item.unitPrice)}원</td>
              <td style="border:1px solid #333;padding:8px;text-align:right;">${formatNumber(item.amount)}원</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr><td colspan="${data.items.some(i => i.spec) ? 6 : 5}" style="border:1px solid #333;padding:8px;text-align:right;background:#F8FAFC;font-weight:700;">공급가액</td><td style="border:1px solid #333;padding:8px;text-align:right;font-weight:700;">${formatNumber(data.subtotal)}원</td></tr>
          <tr><td colspan="${data.items.some(i => i.spec) ? 6 : 5}" style="border:1px solid #333;padding:8px;text-align:right;background:#F8FAFC;font-weight:700;">부가세 (10%)</td><td style="border:1px solid #333;padding:8px;text-align:right;font-weight:700;">${formatNumber(data.vatAmount)}원</td></tr>
          <tr style="background:#1E293B;color:#fff;"><td colspan="${data.items.some(i => i.spec) ? 6 : 5}" style="border:1px solid #1E293B;padding:10px;text-align:right;font-weight:800;font-size:13px;">합계금액</td><td style="border:1px solid #1E293B;padding:10px;text-align:right;font-weight:800;font-size:14px;">${formatNumber(data.total)}원</td></tr>
        </tfoot>
      </table>

      ${data.dispatchBreakdown ? `
        <div style="margin-top:15px;font-size:11px;color:#64748B;border:1px dashed #94A3B8;padding:8px;">
          ※ 파견 구성: 파견근로자 임금분 ${formatNumber(data.dispatchBreakdown.wageAmount)}원 + 파견 수수료(과세) ${formatNumber(data.dispatchBreakdown.feeAmount)}원
        </div>
      ` : ""}

      <div style="margin-top:20px;padding:12px;background:#F0F9FF;border-left:4px solid #0284C7;font-size:12px;">
        <div style="font-weight:700;margin-bottom:5px;">입금 계좌</div>
        ${data.bankInfo.bankName} ${data.bankInfo.accountNumber} (예금주: ${data.bankInfo.accountHolder})
      </div>

      <div style="text-align:center;margin-top:40px;font-size:13px;">${data.invoiceDate}</div>
      <div style="text-align:center;margin-top:15px;">
        <div style="display:inline-block;text-align:center;">
          <div style="font-size:13px;font-weight:700;">${company.name}</div>
          <div style="font-size:13px;margin-bottom:10px;">대표이사 ${company.ceoName}</div>
          ${SEAL_HTML(company.name, company.sealUrl)}
        </div>
      </div>
    </div>
  `;
}

// ────────────────────────────────────────
// 3. 세금계산서 (전자세금계산서 표준)
// ────────────────────────────────────────

export function renderTaxInvoice(data: TaxInvoiceData, company: CompanyInfo, client: ClientInfo): string {
  return `
    <div id="cert-render" style="${CSS_BASE}padding:30px 30px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h1 style="font-size:22px;font-weight:800;margin:0;">전 자 세 금 계 산 서 (${data.receiptType})</h1>
        <div style="font-size:11px;text-align:right;">
          <div>승인번호: ${data.taxInvoiceNo}</div>
          <div>작성일자: ${data.issueDate}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;border:2px solid #000;">
        <tr>
          <td rowspan="5" style="border:1px solid #000;padding:6px;text-align:center;width:4%;background:#FFE4E1;font-weight:700;writing-mode:vertical-rl;">공급자</td>
          <td style="border:1px solid #000;padding:6px;width:12%;background:#F8FAFC;">등록번호</td>
          <td colspan="3" style="border:1px solid #000;padding:6px;font-weight:700;">${company.businessNo}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">상호(법인명)</td>
          <td style="border:1px solid #000;padding:6px;width:35%;">${company.name}</td>
          <td style="border:1px solid #000;padding:6px;width:12%;background:#F8FAFC;">성명</td>
          <td style="border:1px solid #000;padding:6px;">${company.ceoName} (인)</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">사업장 주소</td>
          <td colspan="3" style="border:1px solid #000;padding:6px;">${company.address}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">업태</td>
          <td style="border:1px solid #000;padding:6px;">서비스업</td>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">종목</td>
          <td style="border:1px solid #000;padding:6px;">인력공급/도급</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">이메일</td>
          <td colspan="3" style="border:1px solid #000;padding:6px;">${company.email}</td>
        </tr>

        <tr>
          <td rowspan="5" style="border:1px solid #000;padding:6px;text-align:center;background:#E0F2FE;font-weight:700;writing-mode:vertical-rl;">공급받는자</td>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">등록번호</td>
          <td colspan="3" style="border:1px solid #000;padding:6px;font-weight:700;">${client.businessNo}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">상호(법인명)</td>
          <td style="border:1px solid #000;padding:6px;">${client.name}</td>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">성명</td>
          <td style="border:1px solid #000;padding:6px;">${client.ceoName}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">사업장 주소</td>
          <td colspan="3" style="border:1px solid #000;padding:6px;">${client.address}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">업태</td>
          <td style="border:1px solid #000;padding:6px;">-</td>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">종목</td>
          <td style="border:1px solid #000;padding:6px;">-</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px;background:#F8FAFC;">담당자</td>
          <td colspan="3" style="border:1px solid #000;padding:6px;">${client.contactPerson || "-"}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:5px;border:2px solid #000;">
        <tr style="background:#F8FAFC;font-weight:700;text-align:center;">
          <td style="border:1px solid #000;padding:5px;width:6%;">월/일</td>
          <td style="border:1px solid #000;padding:5px;">품목</td>
          <td style="border:1px solid #000;padding:5px;width:10%;">규격</td>
          <td style="border:1px solid #000;padding:5px;width:8%;">수량</td>
          <td style="border:1px solid #000;padding:5px;width:10%;">단가</td>
          <td style="border:1px solid #000;padding:5px;width:14%;">공급가액</td>
          <td style="border:1px solid #000;padding:5px;width:12%;">세액</td>
          <td style="border:1px solid #000;padding:5px;width:8%;">비고</td>
        </tr>
        ${data.items.map(item => `
          <tr>
            <td style="border:1px solid #000;padding:5px;text-align:center;">${item.monthDay}</td>
            <td style="border:1px solid #000;padding:5px;">${item.description}</td>
            <td style="border:1px solid #000;padding:5px;text-align:center;">${item.spec || "-"}</td>
            <td style="border:1px solid #000;padding:5px;text-align:right;">${formatNumber(item.quantity)}</td>
            <td style="border:1px solid #000;padding:5px;text-align:right;">${formatNumber(item.unitPrice)}</td>
            <td style="border:1px solid #000;padding:5px;text-align:right;">${formatNumber(item.supplyAmount)}</td>
            <td style="border:1px solid #000;padding:5px;text-align:right;">${formatNumber(item.taxAmount)}</td>
            <td style="border:1px solid #000;padding:5px;text-align:center;">${item.note || ""}</td>
          </tr>
        `).join("")}
        ${Array.from({ length: Math.max(0, 4 - data.items.length) }).map(() => `
          <tr><td style="border:1px solid #000;padding:5px;height:25px;">&nbsp;</td><td style="border:1px solid #000;padding:5px;"></td><td style="border:1px solid #000;padding:5px;"></td><td style="border:1px solid #000;padding:5px;"></td><td style="border:1px solid #000;padding:5px;"></td><td style="border:1px solid #000;padding:5px;"></td><td style="border:1px solid #000;padding:5px;"></td><td style="border:1px solid #000;padding:5px;"></td></tr>
        `).join("")}
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:5px;border:2px solid #000;">
        <tr style="background:#FFE4E1;font-weight:700;text-align:center;">
          <td style="border:1px solid #000;padding:8px;">합계금액</td>
          <td style="border:1px solid #000;padding:8px;">현금</td>
          <td style="border:1px solid #000;padding:8px;">수표</td>
          <td style="border:1px solid #000;padding:8px;">어음</td>
          <td style="border:1px solid #000;padding:8px;">외상미수금</td>
          <td rowspan="2" style="border:1px solid #000;padding:8px;width:14%;">이 금액을<br/>${data.receiptType === "영수" ? "영수" : "청구"}함</td>
        </tr>
        <tr style="text-align:right;font-weight:700;">
          <td style="border:1px solid #000;padding:8px;">${formatNumber(data.totalAmount)}원</td>
          <td style="border:1px solid #000;padding:8px;">${formatNumber(data.cashAmount || 0)}</td>
          <td style="border:1px solid #000;padding:8px;">${formatNumber(data.checkAmount || 0)}</td>
          <td style="border:1px solid #000;padding:8px;">${formatNumber(data.noteAmount || 0)}</td>
          <td style="border:1px solid #000;padding:8px;">${formatNumber(data.creditAmount || data.totalAmount)}</td>
        </tr>
      </table>

      <div style="margin-top:8px;display:flex;justify-content:flex-end;font-size:11px;">
        <div style="margin-right:30px;">공급가액 합계: <strong>${formatNumber(data.totalSupplyAmount)}원</strong></div>
        <div>세액 합계: <strong>${formatNumber(data.totalTaxAmount)}원</strong></div>
      </div>
    </div>
  `;
}

// ────────────────────────────────────────
// 4. 급여명세서 (근로기준법 표준)
// ────────────────────────────────────────

export function renderPayslip(data: PayslipData, company: CompanyInfo): string {
  const typeLabel = CONTRACT_TYPE_LABEL[data.contractType];

  return `
    <div id="cert-render" style="${CSS_BASE}">
      <h1 style="text-align:center;font-size:28px;font-weight:800;letter-spacing:8px;margin:10px 0 25px;">급 여 명 세 서</h1>
      <div style="text-align:center;font-size:14px;color:#475569;margin-bottom:20px;">${data.yearMonth} (지급일: ${data.payDate})</div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px;">
        <tr>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;width:15%;font-weight:700;">사업장명</td>
          <td style="border:1px solid #333;padding:8px;width:35%;">${company.name}</td>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;width:15%;font-weight:700;">대표자</td>
          <td style="border:1px solid #333;padding:8px;">${company.ceoName}</td>
        </tr>
        <tr>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;font-weight:700;">성명</td>
          <td style="border:1px solid #333;padding:8px;">${data.employeeName}</td>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;font-weight:700;">사번</td>
          <td style="border:1px solid #333;padding:8px;">${data.employeeNo}</td>
        </tr>
        <tr>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;font-weight:700;">부서</td>
          <td style="border:1px solid #333;padding:8px;">${data.department}</td>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;font-weight:700;">직위</td>
          <td style="border:1px solid #333;padding:8px;">${data.position}</td>
        </tr>
        <tr>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;font-weight:700;">계약 형태</td>
          <td style="border:1px solid #333;padding:8px;">${typeLabel}</td>
          <td style="border:1px solid #333;padding:8px;background:#F8FAFC;font-weight:700;">${data.contractType === "DISPATCH" ? "사용사업주" : "근무지"}</td>
          <td style="border:1px solid #333;padding:8px;">${data.userBusinessName || "-"}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px;">
        <tr style="background:#F8FAFC;font-weight:700;text-align:center;">
          <td style="border:1px solid #333;padding:6px;">근무일수</td>
          <td style="border:1px solid #333;padding:6px;">총 근로시간</td>
          <td style="border:1px solid #333;padding:6px;">연장근로시간</td>
        </tr>
        <tr style="text-align:center;">
          <td style="border:1px solid #333;padding:8px;">${data.attendance.workDays}일</td>
          <td style="border:1px solid #333;padding:8px;">${data.attendance.totalHours}시간</td>
          <td style="border:1px solid #333;padding:8px;">${data.attendance.overtimeHours}시간</td>
        </tr>
      </table>

      <div style="display:flex;gap:15px;">
        <table style="flex:1;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#1E293B;color:#fff;"><th colspan="2" style="border:1px solid #1E293B;padding:8px;">지급 항목</th></tr>
          </thead>
          <tbody>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">기본급</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.payments.basicPay)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">연장근로수당</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.payments.overtimePay)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">야간근로수당</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.payments.nightPay)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">휴일근로수당</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.payments.holidayPay)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">상여금</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.payments.bonus)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">기타</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.payments.otherPay)}원</td></tr>
            <tr style="background:#FEF3C7;font-weight:700;"><td style="border:1px solid #333;padding:8px;">지급 합계</td><td style="border:1px solid #333;padding:8px;text-align:right;">${formatNumber(data.totalPayments)}원</td></tr>
          </tbody>
        </table>

        <table style="flex:1;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#1E293B;color:#fff;"><th colspan="2" style="border:1px solid #1E293B;padding:8px;">공제 항목</th></tr>
          </thead>
          <tbody>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">국민연금</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.nationalPension)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">건강보험</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.healthInsurance)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">장기요양</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.longTermCare)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">고용보험</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.employmentInsurance)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">소득세</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.incomeTax)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">지방소득세</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.localTax)}원</td></tr>
            <tr><td style="border:1px solid #333;padding:6px;background:#F8FAFC;">기타</td><td style="border:1px solid #333;padding:6px;text-align:right;">${formatNumber(data.deductions.otherDeduction)}원</td></tr>
            <tr style="background:#FECACA;font-weight:700;"><td style="border:1px solid #333;padding:8px;">공제 합계</td><td style="border:1px solid #333;padding:8px;text-align:right;">${formatNumber(data.totalDeductions)}원</td></tr>
          </tbody>
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:15px;">
        <tr style="background:#1E293B;color:#fff;font-weight:800;">
          <td style="border:1px solid #1E293B;padding:14px;text-align:center;width:30%;font-size:14px;">실 지 급 액</td>
          <td style="border:1px solid #1E293B;padding:14px;text-align:right;font-size:18px;">${formatNumber(data.netPay)}원</td>
        </tr>
      </table>

      <div style="margin-top:25px;font-size:11px;color:#475569;line-height:1.7;">
        ※ 본 급여명세서는 근로기준법 제48조에 따라 발급되었으며, 임금 지급 명세를 정확히 표시하고 있습니다.<br/>
        ※ 임금 지급 관련 문의: ${company.phone} / ${company.email}
      </div>

      <div style="text-align:center;margin-top:30px;">
        <div style="display:inline-block;text-align:center;">
          <div style="font-size:13px;font-weight:700;">${company.name}</div>
          <div style="font-size:13px;margin-bottom:10px;">대표이사 ${company.ceoName}</div>
          ${SEAL_HTML(company.name, company.sealUrl)}
        </div>
      </div>
    </div>
  `;
}

// ────────────────────────────────────────
// PDF 생성 함수 (HTML → Canvas → PDF)
// ────────────────────────────────────────

export async function generatePDFFromHTML(html: string, fileName: string): Promise<Blob> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);

  const el = document.getElementById("cert-render")!;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
  return pdf.output("blob");
}

// 다운로드 헬퍼
export function downloadPDF(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
