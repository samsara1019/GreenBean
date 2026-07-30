import Link from "next/link";
import { BUSINESS, businessLine, contactLine } from "../lib/business.js";
import { SITE_URL, DEFAULT_DESCRIPTION, pageMetadata } from "../lib/seo.js";

const FEATURES = [
  {
    ico: "🟢",
    title: "진짜 초록불",
    body: "웹 클라이언트와 동일한 방식으로 접속을 유지해, 상대에게 실제 활성 상태로 보입니다.",
  },
  {
    ico: "🕘",
    title: "근무시간 자동화",
    body: "요일·시간·타임존을 설정하면 그 시간에만 켜지고, 퇴근하면 알아서 꺼집니다.",
  },
  {
    ico: "☁️",
    title: "PC 꺼도 OK",
    body: "클라우드에서 24시간 대신 유지합니다. 노트북을 닫아도 상태는 그대로.",
  },
  {
    ico: "🧩",
    title: "1분 연결",
    body: "브라우저 확장으로 클릭 한 번에 연결. 복잡한 관리자 승인이 필요 없습니다.",
  },
  {
    ico: "🔒",
    title: "토큰 암호화",
    body: "자격증명은 AES로 암호화 저장하며, 메시지·DM 내용은 절대 읽지 않습니다.",
  },
  {
    ico: "🏢",
    title: "여러 워크스페이스",
    body: "회사·사이드프로젝트 워크스페이스를 각각 다른 스케줄로.",
  },
];

const STEPS = [
  {
    title: "워크스페이스 연결",
    body: "브라우저 확장 설치 후 Slack에 로그인된 상태에서 클릭 한 번이면 연결됩니다.",
  },
  {
    title: "근무시간 설정",
    body: "평일 09:00–18:00 처럼 원하는 요일·시간·타임존을 지정하세요.",
  },
  {
    title: "자동 유지",
    body: "설정한 시간 동안 초록불이 유지되고, 그 외에는 자동으로 꺼집니다.",
  },
];

// FAQ는 검색 유입의 핵심이다 — 사람들이 실제로 검색창에 치는 문장을 질문으로 쓰고,
// 아래에서 FAQPage 구조화 데이터로도 내보내 구글 리치 결과를 노린다.
const FAQ = [
  {
    q: "슬랙 초록불을 계속 유지할 수 있나요?",
    a: "네. Green Bean은 근무시간 동안 Slack 접속을 대신 유지해 상태를 활성(초록불)으로 계속 표시합니다. PC를 꺼도 클라우드에서 유지되며, 설정한 시간이 지나면 자동으로 꺼집니다.",
  },
  {
    q: "슬랙 자리비움(away)이 뜨지 않게 하려면 어떻게 하나요?",
    a: "Slack은 일정 시간 입력이 없으면 자동으로 자리비움으로 바꿉니다. Green Bean은 웹 클라이언트와 동일한 방식으로 접속을 유지해 자리비움으로 전환되지 않게 합니다. 마우스를 흔들어 두거나 별도 프로그램을 켜둘 필요가 없습니다.",
  },
  {
    q: "정말 상대방에게 초록불로 보이나요?",
    a: "네. 웹 Slack과 동일한 접속을 유지하는 방식이라 상대방 화면에서 활성으로 표시됩니다.",
  },
  {
    q: "안전한가요?",
    a: "자격증명은 암호화되어 저장되고, 메시지·DM은 읽거나 저장하지 않습니다. 다만 자동화 특성상 워크스페이스 정책의 영향을 받을 수 있습니다.",
  },
  {
    q: "관리자 승인이 필요한가요?",
    a: "아니요. 본인 계정의 웹 세션으로 동작하므로 별도 앱 설치 승인이 필요 없습니다.",
  },
  {
    q: "언제든 끌 수 있나요?",
    a: "대시보드에서 토글 한 번으로 즉시 중지할 수 있습니다.",
  },
];

export const metadata = pageMetadata({
  title: "슬랙 초록불 유지 자동화 — Green Bean",
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

// 구조화 데이터. 구글이 이걸 읽어 검색결과에 FAQ 아코디언·앱 정보(가격 등)를
// 표시할 수 있다. 네이버도 일부 스키마를 참고한다.
function StructuredData() {
  const json = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Green Bean",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Chrome",
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "ko-KR",
      offers: {
        "@type": "Offer",
        price: "4900",
        priceCurrency: "KRW",
        description: "Pro 월 구독 (14일 무료 체험)",
        url: `${SITE_URL}/#pricing`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // 정적 문자열만 들어가므로 XSS 위험이 없다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function Landing() {
  return (
    <>
      <StructuredData />
      <header className="container">
        <nav className="nav">
          <div className="brand">
            <span className="dot" /> Green Bean
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a className="btn btn-ghost" href="#pricing">
              가격
            </a>
            <Link className="btn btn-primary" href="/login">
              시작하기
            </Link>
          </div>
        </nav>
      </header>

      <main className="container">
        {/* HERO */}
        <div className="hero">
          <span className="chip chip-success">
            🇰🇷 국내 카드 결제 · 근무시간 자동화
          </span>
          <h1>
            자리를 비워도
            <br />
            Slack은 <span className="hl">계속 초록불</span>
          </h1>
          <p className="lead">
            PC를 꺼도, 점심을 먹어도 <strong>슬랙 초록불</strong>이 그대로. 근무시간
            동안 Slack 상태를 자동으로 활성으로 유지하고 자리비움(away) 전환을
            막습니다. 설정은 딱 한 번, 나머지는 클라우드가 대신합니다.
          </p>
          <div className="cta-row">
            <Link className="btn btn-lg btn-primary" href="/login">
              무료로 시작하기
            </Link>
            <a className="btn btn-lg btn-secondary" href="#how">
              작동 방식 보기
            </a>
          </div>
        </div>

        {/* FEATURES */}
        <section id="features">
          <h2 className="section-title">왜 Green Bean인가</h2>
          <p className="section-sub">
            상태 하나 때문에 마우스를 흔들거나 창을 켜두지 않아도 됩니다.
          </p>
          <div className="grid">
            {FEATURES.map((f) => (
              <div className="card" key={f.title}>
                <div className="ico" aria-hidden="true">
                  {f.ico}
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW */}
        <section id="how">
          <h2 className="section-title">작동 방식</h2>
          <p className="section-sub">연결하고, 시간 정하고, 끝.</p>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.title}>
                <h3>{s.title}</h3>
                <p className="muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing">
          <h2 className="section-title">가격</h2>
          <p className="section-sub">부담 없이 시작하고, 필요하면 올리세요.</p>
          <div className="price-wrap">
            <div className="price">
              <div className="price-head">
                <span className="chip chip-filter">무료 체험</span>
              </div>
              <div className="price-body">
                <div className="amt">
                  14일<span className="per"> 무료</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  Google 계정으로 가입 · 카드 등록 없음
                </p>
                <ul>
                  <li>워크스페이스 1개</li>
                  <li>요일·타임존 세부 스케줄</li>
                  <li>PC 꺼도 상태 유지</li>
                </ul>
                <Link className="btn btn-secondary" href="/login">
                  무료로 시작하기
                </Link>
              </div>
            </div>

            <div className="price featured">
              <div className="price-head">
                <span className="chip">Pro · 체험 이후</span>
              </div>
              <div className="price-body">
                <div className="amt">
                  ₩4,900<span className="per">/월</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  체험 종료 후 구독하면 그대로 유지
                </p>
                <ul>
                  <li>워크스페이스 최대 3개</li>
                  <li>24시간 유지 옵션</li>
                  <li>연결 끊김 알림</li>
                  <li>월 자동 갱신 · 언제든 해지</li>
                </ul>
                <Link className="btn btn-primary" href="/login">
                  14일 무료 체험 시작
                </Link>
              </div>
            </div>
          </div>

          {/* 결제 안내 — 결제 전에 보여야 한다. */}
          <div className="notice" style={{ marginTop: 20 }}>
            <span aria-hidden="true">💳</span>
            <p style={{ margin: 0 }}>
              <strong>결제 안내.</strong> Pro 결제는 결제대행 서비스(Groble)에서
              진행됩니다.
              대시보드의 구독 버튼으로 결제하시면 계정이 자동으로 연결되어, 결제
              확인 후 <strong>몇 분 안에 자동으로</strong> Pro가 활성화됩니다. 월 단위로
              자동 갱신되며 대시보드에서 언제든 해지할 수 있습니다.
            </p>
          </div>
        </section>

        {/* NOTICE */}
        <section>
          <div className="notice">
            <span aria-hidden="true">⚠️</span>
            <p style={{ margin: 0 }}>
              <strong>알아두세요.</strong> 본 서비스는 Slack Technologies와
              무관한 제3자 도구입니다. 자동 상태 유지는 워크스페이스 정책·Slack
              이용약관에 따라 제한될 수 있으며, 그로 인한 계정 조치의 책임은
              이용자에게 있습니다. 자격증명은 암호화 저장되고 메시지 내용에는
              접근하지 않습니다.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <h2 className="section-title">자주 묻는 질문</h2>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {FAQ.map((item) => (
              <div className="faq-item" key={item.q}>
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div style={{ marginBottom: 8 }}>
            <Link href="/guide">설치 가이드</Link> ·{" "}
            <Link href="/terms">이용약관</Link> ·{" "}
            <Link href="/refund">환불정책</Link> ·{" "}
            <Link href="/privacy">개인정보처리방침</Link>
          </div>
          <div className="biz-info">
            {businessLine()}
            <br />
            {contactLine()}
          </div>
          <div style={{ marginTop: 8 }}>
            © 2026 Green Bean · Slack은 Slack Technologies, Inc.의 상표이며 본
            서비스는 Slack과 제휴/보증 관계가 없습니다.
          </div>
        </div>
      </footer>
    </>
  );
}
