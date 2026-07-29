import Link from "next/link";
import { BUSINESS } from "../../lib/business.js";

export const metadata = {
  title: "환불정책 — Green Bean",
  description: "Green Bean 구독 청약철회 및 환불 정책.",
};

const EFFECTIVE_DATE = "2026-07-28";

export default function RefundPage() {
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
          청약철회 및 환불정책
        </h1>
        <p className="muted" style={{ marginBottom: "var(--space-xl)" }}>
          시행일: {EFFECTIVE_DATE}
        </p>

        <h2 className="t-h2">1. 무료 체험</h2>
        <p>
          가입 후 14일간 무료 체험이 제공되며, 이 기간에는 결제가 발생하지 않습니다.
          체험 기간 종료 전 언제든 이용을 중단할 수 있고, 별도의 비용이 청구되지
          않습니다.
        </p>

        <h2 className="t-h2">2. 청약철회 (전자상거래법)</h2>
        <p>
          이용자는 유료 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다. 다만
          「전자상거래 등에서의 소비자보호에 관한 법률」에 따라, 이미 서비스가 제공되어
          이용이 개시된 부분에 대해서는 청약철회가 제한될 수 있습니다. 이 경우 이용
          개시 사실 및 제한 사유를 사전에 고지합니다.
        </p>

        <h2 className="t-h2">3. 이용기간 종료</h2>
        <ul>
          <li>
            유료 이용권은 <strong>1개월 단위 1회성 결제</strong>이며 자동 갱신되지
            않습니다. 따라서 별도의 해지 절차가 없고, 다시 결제하지 않으면 기간 만료와
            함께 유료 이용이 자동으로 종료됩니다.
          </li>
          <li>
            이미 결제된 기간의 이용요금은 원칙적으로 환불되지 않으며, 만료일까지는
            그대로 서비스를 이용할 수 있습니다.
          </li>
        </ul>

        <h2 className="t-h2">4. 전액 환불 사유</h2>
        <ul>
          <li>중복 결제 또는 시스템 오류로 인한 오결제</li>
          <li>서비스 측 귀책으로 서비스를 정상 제공하지 못한 경우</li>
        </ul>

        <h2 className="t-h2">5. 환불 방법 및 기간</h2>
        <p>
          환불은 원 결제수단으로 이루어지며, 환불 요청 승인 후 영업일 기준 3~5일 이내에
          처리됩니다(카드사 정책에 따라 반영 시점이 다를 수 있습니다).
        </p>

        <h2 className="t-h2">6. 환불 요청 방법</h2>
        <p>
          아래 연락처로 가입 이메일과 함께 환불 사유를 보내주시면 확인 후
          처리해드립니다.
        </p>
        <p>
          문의: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ·{" "}
          {BUSINESS.phone}
        </p>
      </main>

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
    </>
  );
}
