import Link from "next/link";

export const metadata = {
  title: "설치 가이드 — Green Bean",
  description: "브라우저 확장을 설치하고 Slack 워크스페이스를 연결하는 방법.",
};

const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || "";

const STEPS = [
  {
    title: "브라우저 확장 설치",
    body: "Chrome 웹스토어에서 Green Bean 확장을 설치합니다. Edge·네이버 웨일에서도 그대로 설치됩니다.",
    cta: true,
  },
  {
    title: "Slack 웹에 로그인",
    body: "app.slack.com 에 로그인된 상태를 유지하세요. 확장은 이 로그인 세션으로 워크스페이스를 인식합니다.",
  },
  {
    title: "워크스페이스 연결",
    body: "확장 아이콘을 클릭하면 로그인된 워크스페이스가 표시됩니다. [연결]을 누르면 대시보드에 추가됩니다.",
  },
  {
    title: "근무시간 설정",
    body: "대시보드에서 요일·시간·타임존을 지정하세요. 그 시간에만 초록불이 유지되고, 그 외에는 자동으로 꺼집니다.",
  },
];

export default function GuidePage() {
  return (
    <>
      <header className="container">
        <nav className="nav">
          <Link className="brand" href="/">
            <span className="dot" /> Green Bean
          </Link>
          <Link className="btn btn-secondary btn-sm" href="/dashboard">
            대시보드
          </Link>
        </nav>
      </header>

      <main className="container" style={{ maxWidth: 760 }}>
        <section style={{ paddingBottom: "var(--space-lg)" }}>
          <span className="chip chip-info">설치 가이드</span>
          <h1 className="t-h1" style={{ margin: "var(--space-md) 0" }}>
            2분이면 초록불이 켜집니다
          </h1>
          <p className="muted" style={{ fontSize: 16 }}>
            확장을 설치하고 워크스페이스를 연결하면 끝입니다. 관리자 승인이나 앱
            설치 심사는 필요 없습니다.
          </p>
        </section>

        {/* 설치 버튼 */}
        <section style={{ paddingTop: 0 }}>
          {EXTENSION_URL ? (
            <a
              className="btn btn-lg btn-primary"
              href={EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chrome 웹스토어에서 설치
            </a>
          ) : (
            <div className="notice">
              <span aria-hidden="true">🧩</span>
              <p style={{ margin: 0 }}>
                <strong>확장 설치 링크 준비 중.</strong> 웹스토어 등록이 완료되면
                여기에 설치 버튼이 표시됩니다. 개발 중에는 아래{" "}
                <a href="#dev">개발자 모드 설치</a>를 참고하세요.
              </p>
            </div>
          )}
        </section>

        {/* 단계 */}
        <section style={{ paddingTop: "var(--space-lg)" }}>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div className="step" key={s.title}>
                <h3 className="t-h3">
                  {i + 1}. {s.title}
                </h3>
                <p className="muted">{s.body}</p>
                {s.cta && EXTENSION_URL && (
                  <a
                    className="btn btn-secondary btn-sm"
                    href={EXTENSION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: "var(--space-sm)" }}
                  >
                    설치 페이지 열기
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 개발자 모드 설치 (웹스토어 등록 전) */}
        <section id="dev" style={{ paddingTop: 0 }}>
          <div className="card" style={{ padding: "var(--space-lg)" }}>
            <h3 className="t-h3" style={{ marginBottom: "var(--space-sm)" }}>
              개발자 모드로 먼저 써보기
            </h3>
            <p className="muted" style={{ marginBottom: "var(--space-md)" }}>
              웹스토어 등록 전 테스트용입니다.
            </p>
            <ol className="guide-ol">
              <li>
                Chrome 주소창에 <code>chrome://extensions</code> 입력
              </li>
              <li>
                우측 상단 <strong>개발자 모드</strong> 켜기
              </li>
              <li>
                <strong>압축해제된 확장 프로그램을 로드</strong> 클릭 →{" "}
                <code>slack-green-extension</code> 폴더 선택
              </li>
              <li>Slack 탭에서 확장 아이콘 클릭 → 워크스페이스 연결</li>
            </ol>
          </div>
        </section>

        {/* 문제 해결 */}
        <section style={{ paddingTop: 0 }}>
          <h2 className="t-h2" style={{ marginBottom: "var(--space-md)" }}>
            잘 안 될 때
          </h2>
          <div className="faq-item">
            <h4 className="t-h4">워크스페이스가 안 보여요</h4>
            <p className="muted">
              app.slack.com에 로그인돼 있는지 확인하고 페이지를 새로고침한 뒤 확장
              아이콘을 다시 눌러보세요.
            </p>
          </div>
          <div className="faq-item">
            <h4 className="t-h4">연결은 됐는데 초록불이 안 켜져요</h4>
            <p className="muted">
              대시보드에서 해당 워크스페이스가 켜짐 상태이고, 지금이 설정한
              근무시간 안인지 확인하세요. 체험/구독이 만료되면 유지가 중지됩니다.
            </p>
          </div>
          <div className="faq-item">
            <h4 className="t-h4">일부 회사 워크스페이스는 연결이 안 돼요</h4>
            <p className="muted">
              보안 정책(Enterprise Grid 등)으로 실시간 연결이 차단된 경우일 수
              있습니다. 다른 워크스페이스로 시도해 보세요.
            </p>
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="notice">
            <span aria-hidden="true">⚠️</span>
            <p style={{ margin: 0 }}>
              본 서비스는 Slack Technologies와 무관한 제3자 도구입니다. 자동 상태
              유지는 워크스페이스 정책·Slack 이용약관의 영향을 받을 수 있습니다.
              자세한 내용은 <Link href="/privacy">개인정보처리방침</Link>을
              참고하세요.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          © 2026 Green Bean · Slack은 Slack Technologies, Inc.의 상표입니다.
        </div>
      </footer>
    </>
  );
}
