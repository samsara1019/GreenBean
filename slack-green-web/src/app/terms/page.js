import Link from "next/link";
import { BUSINESS } from "../../lib/business.js";

export const metadata = {
  title: "이용약관 — Green Bean",
  description: "Green Bean 서비스 이용약관.",
};

const EFFECTIVE_DATE = "2026-07-28";

export default function TermsPage() {
  return (
    <>
      <header className="container">
        <nav className="nav">
          <Link className="brand" href="/">
            <span className="dot" /> Green Bean
          </Link>
          <Link className="btn btn-secondary btn-sm" href="/">
            홈
          </Link>
        </nav>
      </header>

      <main className="container legal" style={{ maxWidth: 760 }}>
        <h1 className="t-h1" style={{ marginBottom: "var(--space-sm)" }}>
          이용약관
        </h1>
        <p className="muted" style={{ marginBottom: "var(--space-xl)" }}>
          시행일: {EFFECTIVE_DATE}
        </p>

        <h2 className="t-h2">제1조 (목적)</h2>
        <p>
          본 약관은 {BUSINESS.service}(이하 &ldquo;서비스&rdquo;)가 제공하는 Slack
          상태 자동 유지 서비스의 이용과 관련하여 서비스와 이용자 간의 권리·의무 및
          책임사항을 규정함을 목적으로 합니다.
        </p>

        <h2 className="t-h2">제2조 (정의)</h2>
        <ul>
          <li>&ldquo;이용자&rdquo;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
          <li>
            &ldquo;연결&rdquo;이란 이용자가 자신의 Slack 워크스페이스를 서비스에
            등록하여 상태 유지 대상으로 지정하는 것을 말합니다.
          </li>
          <li>
            &ldquo;이용권&rdquo;이란 무료 체험 종료 후 유료로 서비스를 계속 이용하기
            위해 1개월 단위로 결제하는 이용 권한을 말합니다. 자동 갱신되지 않습니다.
          </li>
        </ul>

        <h2 className="t-h2">제3조 (약관의 효력 및 변경)</h2>
        <p>
          본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 서비스는 관련 법령을
          위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자와 사유를
          명시하여 사전 공지합니다.
        </p>

        <h2 className="t-h2">제4조 (서비스의 내용)</h2>
        <p>
          서비스는 이용자가 설정한 근무시간 동안 이용자의 Slack 접속 상태를
          활성(초록불)으로 유지합니다. 서비스는 이용자의 메시지·DM 등 대화 내용에
          접근하지 않습니다.
        </p>

        <h2 className="t-h2">제5조 (회원가입 및 계정)</h2>
        <p>
          이용자는 Google 계정을 통해 가입하며, 계정 정보의 관리 책임은 이용자에게
          있습니다. 타인의 계정·자격증명을 무단으로 등록해서는 안 됩니다.
        </p>

        <h2 className="t-h2">제6조 (유료서비스 및 결제)</h2>
        <ul>
          <li>가입 시 14일간 무료 체험이 제공되며, 체험 기간에는 결제가 발생하지 않습니다.</li>
          <li>
            체험 종료 후 이용자가 결제하면 결제일로부터 1개월간 이용할 수 있습니다.
            <strong> 자동 결제·자동 갱신은 이루어지지 않습니다.</strong> 계속 이용하려면
            기간 만료 전후에 다시 결제해야 합니다.
          </li>
          <li>
            결제는 외부 결제 페이지(Groble)를 통해 처리되며, 서비스는 카드 정보를
            수집·보관하지 않습니다.
          </li>
          <li>
            결제 시 <strong>가입한 계정과 동일한 이메일</strong>을 사용해야 하며, 결제
            확인 후 24시간 이내에 이용권이 활성화됩니다. 이메일이 일치하지 않으면 적용
            대상을 확인할 수 없어 활성화가 지연될 수 있습니다.
          </li>
          <li>
            자동 결제가 없으므로 별도의 해지 절차가 필요하지 않으며, 다시 결제하지
            않으면 기간 만료와 함께 유료 이용이 자동으로 종료됩니다.
          </li>
        </ul>

        <h2 className="t-h2">제7조 (청약철회 및 환불)</h2>
        <p>
          청약철회 및 환불에 관한 사항은 <Link href="/refund">환불정책</Link>에 따릅니다.
        </p>

        <h2 className="t-h2">제8조 (이용자의 의무)</h2>
        <ul>
          <li>본인이 정당한 권한을 가진 워크스페이스만 연결하여야 합니다.</li>
          <li>
            소속 워크스페이스의 정책 및 Slack 이용약관을 준수할 책임은 이용자에게
            있습니다.
          </li>
          <li>서비스를 이용한 부정·불법 행위를 하여서는 안 됩니다.</li>
        </ul>

        <h2 className="t-h2">제9조 (서비스의 중단·제한)</h2>
        <p>
          서비스는 시스템 점검, 외부 서비스(Slack 등)의 정책·기술 변경, 천재지변 등
          불가항력이 있는 경우 서비스 제공을 일시 중단하거나 제한할 수 있습니다.
        </p>

        <h2 className="t-h2">제10조 (면책)</h2>
        <ul>
          <li>
            본 서비스는 Slack Technologies, Inc.와 무관하며 제휴·보증 관계가 없습니다.
          </li>
          <li>
            자동 상태 유지는 워크스페이스 정책·Slack 이용약관에 따라 제한될 수 있으며,
            그로 인한 계정 조치의 책임은 이용자에게 있습니다.
          </li>
          <li>
            서비스는 외부 서비스의 정책 변경으로 인한 기능 중단에 대해 책임을 지지
            않습니다.
          </li>
        </ul>

        <h2 className="t-h2">제11조 (개인정보 보호)</h2>
        <p>
          개인정보의 처리에 관한 사항은{" "}
          <Link href="/privacy">개인정보처리방침</Link>에 따릅니다.
        </p>

        <h2 className="t-h2">제12조 (준거법 및 관할)</h2>
        <p>
          본 약관은 대한민국 법령에 따라 해석되며, 서비스와 이용자 간 분쟁에 관한
          소송은 관련 법령에 따른 관할 법원에 제기합니다.
        </p>

        <h2 className="t-h2">제13조 (문의)</h2>
        <p>
          문의: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
        </p>
      </main>

      <LegalFooter />
    </>
  );
}

function LegalFooter() {
  return (
    <footer>
      <div className="container">
        <div style={{ marginBottom: 8 }}>
          <Link href="/terms">이용약관</Link> ·{" "}
          <Link href="/refund">환불정책</Link> ·{" "}
          <Link href="/privacy">개인정보처리방침</Link>
        </div>
        <div className="biz-info">
          {BUSINESS.service} · {BUSINESS.company} · 대표 {BUSINESS.owner} ·
          사업자등록번호 {BUSINESS.bizNo} · 통신판매업신고 {BUSINESS.mailOrderNo}
          <br />
          {BUSINESS.address} · {BUSINESS.email} · {BUSINESS.phone}
        </div>
      </div>
    </footer>
  );
}
