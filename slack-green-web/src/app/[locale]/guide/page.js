import { setRequestLocale } from "next-intl/server";
import { Link } from "../../../i18n/navigation.js";
import UntranslatedNotice from "../../../components/untranslated-notice.js";
import { pageMetadata } from "../../../lib/seo.js";
import RequestDevButton from "./RequestDevButton.js";

export function generateMetadata({ params: { locale } }) {
  return pageMetadata({
    locale,
    title: "설치 가이드",
    description:
      "Slack 워크스페이스를 수동으로 연결해 근무시간에 초록불을 유지하는 방법. (브라우저 확장은 준비 중)",
    path: "/guide",
  });
}

const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || "";

// 확장 기반 4단계 안내(STEPS)는 확장 출시 전까지 숨김. 지금은 수동 연결이 메인.

export default function GuidePage({ params: { locale } }) {
  setRequestLocale(locale);

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
        <UntranslatedNotice />

        <section style={{ paddingBottom: "var(--space-lg)" }}>
          <span className="chip chip-info">연결 가이드</span>
          <h1 className="t-h1" style={{ margin: "var(--space-md) 0" }}>
            수동으로 바로 연결하기
          </h1>
          <p className="muted" style={{ fontSize: 16 }}>
            브라우저 확장(클릭 한 번 연결)은 준비 중입니다. 그동안은 값 두 개만
            붙여넣으면 바로 연결돼요. 관리자 승인은 필요 없습니다.
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
            <>
              <div className="notice">
                <span aria-hidden="true">🧩</span>
                <p style={{ margin: 0 }}>
                  <strong>브라우저 확장(클릭 한 번 연결)은 준비 중이에요.</strong>{" "}
                  지금은 아래 방법으로 <strong>수동 연결</strong>하면 바로 사용할 수
                  있습니다.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-sm)",
                  flexWrap: "wrap",
                  marginTop: "var(--space-md)",
                }}
              >
                <Link
                  className="btn btn-lg btn-primary"
                  href="/dashboard?connect=1"
                >
                  워크스페이스 연결하러 가기 →
                </Link>
                <a className="btn btn-lg btn-secondary" href="#manual">
                  연결 방법 자세히 보기
                </a>
              </div>
              <RequestDevButton />
            </>
          )}
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

        {/* 확장 없이 직접 입력 — 자격증명 두 개를 손으로 얻는 방법 */}
        <section id="manual" style={{ paddingTop: 0 }}>
          <div className="card" style={{ padding: "var(--space-lg)" }}>
            <h3 className="t-h3" style={{ marginBottom: "var(--space-sm)" }}>
              확장 없이 직접 입력하기 (xoxc · xoxd 얻는 방법)
            </h3>
            <p className="muted" style={{ marginBottom: "var(--space-md)" }}>
              대시보드의 <strong>+ 워크스페이스 연결</strong> 폼에 값을 직접 넣는
              방법입니다. 두 값의 저장 위치가 달라서 각각 다른 곳에서 가져옵니다 —
              토큰은 브라우저 저장소, 쿠키는 HttpOnly라 개발자도구에서만 보입니다.
            </p>

            <h4 className="t-h4" style={{ marginBottom: "var(--space-sm)" }}>
              준비
            </h4>
            <ol className="guide-ol" style={{ marginBottom: "var(--space-lg)" }}>
              <li>
                Chrome에서 <code>https://app.slack.com</code> 에 로그인합니다.
                (데스크톱 앱이 아니라 <strong>웹 브라우저</strong>여야 합니다)
              </li>
              <li>
                <code>F12</code> (macOS는 <code>⌥⌘I</code>) 로 개발자도구를 엽니다.
              </li>
            </ol>

            <h4 className="t-h4" style={{ marginBottom: "var(--space-sm)" }}>
              ① xoxc 토큰 — Console 탭
            </h4>
            <ol className="guide-ol" style={{ marginBottom: "var(--space-lg)" }}>
              <li>
                <strong>Console</strong> 탭으로 이동합니다.
              </li>
              <li>
                Chrome이 붙여넣기를 막으면 콘솔에 <code>allow pasting</code> 을
                입력하고 Enter를 한 번 눌러 허용합니다.
              </li>
              <li>
                아래 한 줄을 붙여넣고 Enter:
                <pre>
                  <code>
                    {`Object.values(JSON.parse(localStorage.localConfig_v2).teams).map(t => ({ 워크스페이스: t.name, token: t.token }))`}
                  </code>
                </pre>
              </li>
              <li>
                워크스페이스 목록이 나옵니다. 삼각형을 눌러 펼치고, 연결할
                워크스페이스의 <code>token</code> 값(<code>xoxc-</code> 로 시작)을
                복사합니다.
              </li>
            </ol>

            <h4 className="t-h4" style={{ marginBottom: "var(--space-sm)" }}>
              ② xoxd 쿠키 — Application 탭
            </h4>
            <p className="muted" style={{ marginBottom: "var(--space-sm)" }}>
              이 값은 <code>document.cookie</code> 로 읽을 수 없습니다(HttpOnly).
              반드시 아래 경로로 확인하세요.
            </p>
            <ol className="guide-ol" style={{ marginBottom: "var(--space-lg)" }}>
              <li>
                개발자도구에서 <strong>Application</strong> 탭을 엽니다. (탭이 안
                보이면 <code>≫</code> 버튼을 눌러 찾으세요)
              </li>
              <li>
                왼쪽 트리에서 <strong>Storage → Cookies →</strong>{" "}
                <code>https://app.slack.com</code> 을 클릭합니다.
              </li>
              <li>
                Name 열이 정확히 <code>d</code> 인 행을 찾아 클릭합니다.
                <br />
                <span className="muted">
                  <code>d-s</code>, <code>lc</code> 등 비슷한 이름과 혼동하지
                  마세요. 필요하면 위쪽 필터 칸에 <code>d</code> 를 입력하세요.
                </span>
              </li>
              <li>
                아래 <strong>Cookie Value</strong> 영역의 값(<code>xoxd-</code> 로
                시작)을 전체 복사합니다. 길고 <code>%</code> 기호가 섞여 있어도 그대로
                복사하면 됩니다.
              </li>
            </ol>

            <h4 className="t-h4" style={{ marginBottom: "var(--space-sm)" }}>
              ③ 대시보드에 붙여넣기
            </h4>
            <ol className="guide-ol" style={{ marginBottom: "var(--space-md)" }}>
              <li>
                <a href="/dashboard">대시보드</a> → <strong>+ 워크스페이스 연결</strong>
              </li>
              <li>
                <strong>워크스페이스 이름</strong>은 알아보기 쉬운 이름으로 (예:
                우리회사)
              </li>
              <li>
                <strong>xoxc 토큰</strong> 칸에 ①의 값,{" "}
                <strong>xoxd 쿠키 값</strong> 칸에 ②의 값을 붙여넣습니다.
              </li>
              <li>근무 요일·시간·타임존을 지정하고 저장하면 끝입니다.</li>
            </ol>

            <div className="notice">
              <span aria-hidden="true">🔐</span>
              <p style={{ margin: 0 }}>
                <strong>이 두 값은 사실상 계정 비밀번호와 같습니다.</strong> 누구에게도
                공유하거나 스크린샷으로 남기지 마세요. 저장 시 서버에서 즉시 암호화되고
                화면에는 일부만 표시됩니다. Slack에서 <strong>모든 세션에서
                로그아웃</strong>하거나 비밀번호를 변경하면 두 값이 무효화되므로 다시
                입력해야 합니다.
              </p>
            </div>
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
