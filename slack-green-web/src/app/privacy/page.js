import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 — Green Bean",
  description: "Green Bean이 수집·이용·보관하는 정보와 그 처리 방식.",
};

// TODO(prod): 아래 연락처와 사업자 정보를 실제 값으로 교체할 것.
const CONTACT_EMAIL = "privacy@alwaysgreen.kr";
const EFFECTIVE_DATE = "2026-07-27";

export default function PrivacyPage() {
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
          개인정보처리방침
        </h1>
        <p className="muted" style={{ marginBottom: "var(--space-xl)" }}>
          시행일: {EFFECTIVE_DATE}
        </p>

        <p>
          Green Bean(이하 &ldquo;서비스&rdquo;)은 이용자가 근무시간 동안 Slack
          상태를 활성으로 유지할 수 있도록 돕는 도구입니다. 본 방침은 서비스가
          어떤 정보를 수집하고 어떻게 처리하는지 설명합니다. 본 서비스는 Slack
          Technologies, Inc.와 무관하며 제휴·보증 관계가 없습니다.
        </p>

        <h2 className="t-h2">1. 수집하는 정보</h2>
        <ul>
          <li>
            <strong>계정 정보</strong> — Google 로그인으로 제공되는 이메일 및
            계정 식별자(인증 및 구독 관리 목적).
          </li>
          <li>
            <strong>Slack 자격증명</strong> — 이용자가 연결한 워크스페이스의 웹
            클라이언트 토큰(xoxc)과 세션 쿠키(<code>d</code>). 이용자의 상태를
            대신 유지하기 위한 필수 정보입니다.
          </li>
          <li>
            <strong>설정 정보</strong> — 워크스페이스 이름, 근무 요일·시간·타임존.
          </li>
          <li>
            <strong>결제 정보</strong> — 구독 결제는 포트원(PortOne)을 통해
            처리되며, 카드 정보는 서비스 서버에 저장되지 않고 결제대행사가
            처리합니다. 서비스는 결제 상태와 빌링키만 보관합니다.
          </li>
        </ul>

        <h2 className="t-h2">2. 수집하지 않는 정보</h2>
        <p>
          서비스는 이용자의 Slack <strong>메시지·DM·채널 내용을 읽거나 저장하지
          않습니다.</strong> 실시간 연결은 오직 &ldquo;접속 상태&rdquo; 유지에만
          사용되며, 대화 내용에 접근하지 않습니다.
        </p>

        <h2 className="t-h2">3. 브라우저 확장이 접근하는 정보</h2>
        <p>
          Green Bean 브라우저 확장은 이용자가 직접 실행(아이콘 클릭)할 때만
          동작하며, Slack 웹 페이지의 로컬 저장소에서 워크스페이스 토큰을, 브라우저
          쿠키에서 <code>d</code> 세션 값을 읽어 서비스 서버로 안전하게(HTTPS)
          전송합니다. 이 값들은 이용자가 명시적으로 [연결]을 눌렀을 때만
          전송됩니다.
        </p>

        <h2 className="t-h2">4. 정보의 이용 목적</h2>
        <p>
          수집한 정보는 오직 (1) 이용자 인증, (2) 설정한 근무시간에 따른 Slack
          상태 유지, (3) 구독 결제 처리 목적으로만 이용합니다. 그 외 목적으로
          이용하거나 제3자에게 판매하지 않습니다.
        </p>

        <h2 className="t-h2">5. 보관 및 보안</h2>
        <ul>
          <li>
            Slack 자격증명과 결제 빌링키는 <strong>AES-256-GCM으로 암호화</strong>
            되어 저장됩니다.
          </li>
          <li>데이터는 접근이 제한된 데이터베이스(Supabase)에 보관됩니다.</li>
          <li>
            전송 구간은 전 구간 HTTPS로 암호화되며, 자격증명은 로그에 남기지
            않습니다.
          </li>
        </ul>

        <h2 className="t-h2">6. 제3자 처리업체</h2>
        <ul>
          <li>
            <strong>Supabase</strong> — 데이터베이스 및 인증
          </li>
          <li>
            <strong>PortOne(포트원)</strong> — 결제 처리
          </li>
          <li>
            <strong>Vercel / Railway</strong> — 애플리케이션 및 워커 호스팅
          </li>
          <li>
            <strong>Google</strong> — 로그인(OAuth)
          </li>
        </ul>

        <h2 className="t-h2">7. 보관 기간 및 삭제</h2>
        <p>
          이용자는 대시보드에서 언제든 워크스페이스 연결을 삭제할 수 있으며, 삭제
          시 해당 자격증명은 즉시 제거됩니다. 계정 삭제를 요청하면 관련 개인정보를
          모두 파기합니다.
        </p>

        <h2 className="t-h2">8. 이용자의 권리</h2>
        <p>
          이용자는 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수
          있습니다. 요청은 아래 연락처로 접수해 주세요.
        </p>

        <h2 className="t-h2">9. 변경 고지</h2>
        <p>
          본 방침이 변경되는 경우 시행일과 함께 본 페이지에 게시합니다.
        </p>

        <h2 className="t-h2">10. 문의처</h2>
        <p>
          개인정보 관련 문의:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <div className="notice" style={{ marginTop: "var(--space-xl)" }}>
          <span aria-hidden="true">ℹ️</span>
          <p style={{ margin: 0 }}>
            자동 상태 유지는 워크스페이스 정책·Slack 이용약관에 따라 제한될 수
            있으며, 그로 인한 계정 조치의 책임은 이용자에게 있습니다.
          </p>
        </div>
      </main>

      <footer>
        <div className="container">
          © 2026 Green Bean · <Link href="/">홈</Link> ·{" "}
          <Link href="/guide">설치 가이드</Link>
        </div>
      </footer>
    </>
  );
}
