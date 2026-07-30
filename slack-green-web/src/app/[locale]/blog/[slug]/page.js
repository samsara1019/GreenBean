import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { POSTS, getPost } from "../../../../lib/posts.js";
import { SITE_URL, SITE_NAME, pageMetadata } from "../../../../lib/seo.js";
import { Link } from "../../../../i18n/navigation.js";
import UntranslatedNotice from "../../../../components/untranslated-notice.js";

// 빌드 시점에 모든 글을 정적 생성한다 → 크롤러가 즉시 완성된 HTML을 받는다.
// locale 은 상위 [locale] 세그먼트가 생성하므로 여기서는 slug 만 돌려주면
// Next 가 (locale × slug) 조합을 만들어 준다.
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params: { locale, slug } }) {
  const post = getPost(slug);
  if (!post) return {};
  // 글 본문은 한국어뿐이므로 pageMetadata 가 canonical 을 한국어 URL로 보내고
  // 다른 로케일에는 noindex 를 건다. OG 도 그에 맞춰 한국어 URL을 가리킨다.
  return {
    ...pageMetadata({
      locale,
      title: post.title,
      description: post.description,
      path: `/blog/${post.slug}`,
    }),
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "article",
      publishedTime: post.date,
    },
  };
}

// 블록 배열 → JSX. p 안에 <strong> 같은 최소한의 강조만 허용하므로
// 콘텐츠는 우리가 작성한 정적 문자열만 들어간다(외부 입력 없음).
function Block({ block }) {
  if (block.h2) return <h2 className="t-h2">{block.h2}</h2>;
  if (block.p) return <p dangerouslySetInnerHTML={{ __html: block.p }} />;
  if (block.ul)
    return (
      <ul>
        {block.ul.map((li, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: li }} />
        ))}
      </ul>
    );
  if (block.ol)
    return (
      <ol className="guide-ol">
        {block.ol.map((li, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: li }} />
        ))}
      </ol>
    );
  if (block.note)
    return (
      <div className="notice" style={{ margin: "20px 0" }}>
        <span aria-hidden="true">💡</span>
        <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: block.note }} />
      </div>
    );
  if (block.cta)
    return (
      <p style={{ margin: "28px 0" }}>
        <Link className="btn btn-primary btn-lg" href="/login">
          {block.cta}
        </Link>
      </p>
    );
  return null;
}

export default function PostPage({ params: { locale, slug } }) {
  setRequestLocale(locale);

  const post = getPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  // Article + BreadcrumbList 구조화 데이터. 검색결과에 경로와 게시일이 노출될 수 있다.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: "ko-KR",
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "가이드", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  const others = POSTS.filter((p) => p.slug !== post.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

      <main className="container legal" style={{ maxWidth: 760 }}>
        <p className="t-caption muted" style={{ marginBottom: 8 }}>
          <Link href="/blog">가이드</Link> · {post.date}
        </p>
        <h1 className="t-h1" style={{ marginBottom: "var(--space-lg)" }}>
          {post.title}
        </h1>

        {post.body.map((block, i) => (
          <Block key={i} block={block} />
        ))}

        {/* 내부 링크 — 크롤러가 글 사이를 돌아다닐 수 있게 한다. */}
        <h2 className="t-h2">함께 읽기</h2>
        <ul>
          {others.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`}>{p.title}</Link>
            </li>
          ))}
          <li>
            <Link href="/guide">Green Bean 설치 가이드 (1분)</Link>
          </li>
        </ul>
      </main>

      <footer>
        <div className="container">
          <Link href="/">홈</Link> · <Link href="/blog">가이드</Link> ·{" "}
          <Link href="/terms">이용약관</Link> ·{" "}
          <Link href="/privacy">개인정보처리방침</Link>
        </div>
      </footer>
    </>
  );
}
