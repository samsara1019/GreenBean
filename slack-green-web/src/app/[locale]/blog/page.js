import { setRequestLocale } from "next-intl/server";
import { POSTS } from "../../../lib/posts.js";
import { pageMetadata } from "../../../lib/seo.js";
import { Link } from "../../../i18n/navigation.js";
import UntranslatedNotice from "../../../components/untranslated-notice.js";

export function generateMetadata({ params: { locale } }) {
  return pageMetadata({
    locale,
    title: "슬랙 상태 관리 가이드",
    description:
      "슬랙 초록불 유지, 자리비움 해제, 재택근무 상태 관리에 대한 실용 가이드 모음.",
    path: "/blog",
  });
}

export default function BlogIndex({ params: { locale } }) {
  setRequestLocale(locale);

  return (
    <>
      <header className="container">
        <nav className="nav">
          <Link className="brand" href="/">
            <span className="dot" /> Green Bean
          </Link>
          <Link className="btn btn-primary btn-sm" href="/login">
            무료로 시작하기
          </Link>
        </nav>
      </header>

      <main className="container" style={{ maxWidth: 760 }}>
        <UntranslatedNotice />

        <h1 className="t-h1" style={{ marginBottom: "var(--space-sm)" }}>
          슬랙 상태 관리 가이드
        </h1>
        <p className="muted" style={{ marginBottom: "var(--space-xl)" }}>
          초록불이 어떻게 정해지는지, 자리비움을 어떻게 다루는지 정리했습니다.
        </p>

        <div className="conn-list">
          {POSTS.map((p) => (
            <article className="card" key={p.slug} style={{ marginBottom: 16 }}>
              <h2 className="t-h3" style={{ marginBottom: 8 }}>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {p.description}
              </p>
              <p className="t-caption muted" style={{ marginTop: 8, marginBottom: 0 }}>
                {p.date}
              </p>
            </article>
          ))}
        </div>
      </main>

      <footer>
        <div className="container">
          <Link href="/">홈</Link> · <Link href="/guide">설치 가이드</Link> ·{" "}
          <Link href="/terms">이용약관</Link> ·{" "}
          <Link href="/privacy">개인정보처리방침</Link>
        </div>
      </footer>
    </>
  );
}
