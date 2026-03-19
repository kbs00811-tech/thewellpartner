import { PageHero } from "../components/shared";

export default function Privacy() {
  return (
    <div className="w-full">
      <PageHero
        label="Privacy Policy"
        title="개인정보처리방침"
        subtitle="더웰파트너의 개인정보 처리 방침을 안내합니다"
      />

      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="prose prose-sm max-w-none text-[var(--brand-body)]">
            {sections.map((section, i) => (
              <div key={i} className="mb-10">
                <h2 className="text-lg font-bold text-[var(--brand-heading)] mb-3">
                  {section.title}
                </h2>
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-5 rounded-2xl bg-[var(--brand-section-alt)] border border-[var(--brand-border)]">
            <p className="text-xs text-[var(--brand-body-light)]">
              <strong className="text-[var(--brand-heading)]">시행일:</strong> 본 방침은 2025년 1월 1일부터 시행됩니다.
              <br />
              <strong className="text-[var(--brand-heading)]">문의:</strong> 개인정보 관련 문의는 031-XXX-XXXX 또는 contact@thewellpartner.com으로 연락주세요.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const sections = [
  {
    title: "제1조 (개인정보의 처리 목적)",
    content: `더웰파트너(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다.

1. 인력 파견 및 도급 서비스 제공을 위한 근로자 관리
2. 기업 고객사의 인력 운영 서비스 상담 및 계약 체결
3. 구직자의 채용 지원 접수 및 매칭
4. 급여 계산, 4대보험 가입, 근태관리 등 인사노무 업무
5. 서류발급센터를 통한 재직증명서, 급여명세서 등 발급
6. 고객 문의 응대 및 민원 처리`,
  },
  {
    title: "제2조 (수집하는 개인정보 항목)",
    content: `회사는 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다.

[필수항목]
- 성명, 생년월일, 연락처(휴대전화), 주소
- 사번, 소속 부서, 직위, 근무지

[선택항목]
- 이메일, 경력사항, 자격증, 희망 근무조건
- 외국인 근로자: 여권번호, 체류자격, 비자 만료일`,
  },
  {
    title: "제3조 (개인정보의 보유 및 이용기간)",
    content: `회사는 법령에 따른 보유기간 또는 정보주체로부터 동의받은 기간 동안 개인정보를 보유합니다.

- 근로계약 관련 기록: 근로기준법에 따라 3년
- 임금대장 및 급여기록: 근로기준법에 따라 3년
- 4대보험 관련 기록: 국민건강보험법 등 관련법에 따라 3년
- 고객 상담 기록: 3년
- 채용 지원자 정보: 지원 후 1년 (동의 시 3년)`,
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    content: `회사는 원칙적으로 정보주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.

1. 정보주체가 사전에 동의한 경우
2. 법률에 특별한 규정이 있는 경우
3. 인력 파견·도급 계약 이행을 위해 고객사에 필요 최소한의 정보를 제공하는 경우
4. 4대보험 신고 등 법적 의무 이행을 위한 경우`,
  },
  {
    title: "제5조 (개인정보의 파기)",
    content: `회사는 보유기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.

- 전자적 파일: 복원이 불가능한 방법으로 영구 삭제
- 종이 문서: 분쇄기로 분쇄하거나 소각`,
  },
  {
    title: "제6조 (정보주체의 권리·의무)",
    content: `정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다.

1. 개인정보 열람 요구
2. 오류 등이 있을 경우 정정 요구
3. 삭제 요구
4. 처리정지 요구

권리 행사는 서면, 전화, 이메일 등을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.`,
  },
  {
    title: "제7조 (개인정보 보호책임자)",
    content: `회사는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를 지정하고 있습니다.

- 개인정보 보호책임자: 대표이사
- 연락처: 031-XXX-XXXX
- 이메일: contact@thewellpartner.com`,
  },
];
