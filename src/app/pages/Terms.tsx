import { PageHero } from "../components/shared";

export default function Terms() {
  return (
    <div className="w-full">
      <PageHero
        label="Terms of Service"
        title="이용약관"
        subtitle="더웰파트너 홈페이지 이용약관을 안내합니다"
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
              <strong className="text-[var(--brand-heading)]">시행일:</strong> 본 약관은 2025년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const sections = [
  {
    title: "제1조 (목적)",
    content: `본 약관은 더웰파트너(이하 "회사")가 운영하는 홈페이지에서 제공하는 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: "제2조 (정의)",
    content: `1. "서비스"란 회사가 홈페이지를 통해 제공하는 기업 상담 신청, 채용 정보 열람, 입사지원, 서류발급센터, 사원등록 등 일체의 서비스를 말합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.
3. "구직자"란 회사의 채용 서비스를 통해 취업 지원을 하는 자를 말합니다.
4. "기업 고객"이란 회사에 인력 파견, 도급 등의 서비스를 의뢰하는 법인 또는 개인사업자를 말합니다.`,
  },
  {
    title: "제3조 (약관의 효력 및 변경)",
    content: `1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.
3. 약관이 변경되는 경우 회사는 변경된 약관의 내용과 시행일을 홈페이지에 최소 7일 전부터 공지합니다.`,
  },
  {
    title: "제4조 (서비스의 제공)",
    content: `회사는 다음과 같은 서비스를 제공합니다.

1. 기업 고객 대상 인력 운영 서비스 상담 접수
2. 구직자 대상 채용 정보 제공 및 입사 지원 접수
3. 재직 직원 대상 서류발급센터(재직증명서, 급여명세서 등)
4. 신규 사원 등록 및 사번 발급
5. 공지사항, FAQ 등 고객센터 정보 제공
6. 기타 회사가 정하는 서비스`,
  },
  {
    title: "제5조 (이용자의 의무)",
    content: `이용자는 다음 행위를 하여서는 안 됩니다.

1. 타인의 정보를 도용하여 서비스를 이용하는 행위
2. 회사 서비스에 게시된 정보를 무단으로 변경하는 행위
3. 회사의 서비스 운영을 고의로 방해하는 행위
4. 관련 법령, 본 약관, 이용 안내 등을 위반하는 행위
5. 기타 공공질서 및 미풍양속에 반하는 행위`,
  },
  {
    title: "제6조 (서비스의 중단)",
    content: `회사는 다음의 경우 서비스 제공을 일시적으로 중단할 수 있습니다.

1. 시스템 정기 점검, 교체 또는 고장 등 부득이한 경우
2. 전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지한 경우
3. 기타 불가항력적 사유가 있는 경우`,
  },
  {
    title: "제7조 (책임 제한)",
    content: `1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.
2. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.
3. 회사는 이용자가 서비스를 이용하여 기대하는 결과를 얻지 못한 것에 대해 책임을 지지 않습니다.`,
  },
  {
    title: "제8조 (분쟁 해결)",
    content: `1. 회사와 이용자 간에 발생한 분쟁에 대해서는 상호 협의하여 해결합니다.
2. 협의가 이루어지지 않을 경우, 회사 소재지를 관할하는 법원을 전속 관할법원으로 합니다.`,
  },
];
