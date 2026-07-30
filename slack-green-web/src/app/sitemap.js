// /sitemap.xml 자동 생성. 구글 서치 콘솔·네이버 서치어드바이저에 이 URL을 제출한다.
//
// 로그인이 필요한 경로(/dashboard, /login)는 넣지 않는다 — 크롤러에겐 내용이 없는
// 페이지라 넣어도 색인되지 않고, robots.txt 와 모순만 생긴다.
//
// 다국어 규칙:
//   - 번역이 있는 페이지(/)는 로케일마다 URL을 넣고 alternates.languages 로
//     서로를 가리키게 한다. 구글은 sitemap 의 hreflang 을 <head> 의 것과 같은
//     신호로 취급하므로 둘 다 넣어두면 누락 위험이 줄어든다.
//   - 한국어 원문만 있는 페이지(약관·블로그 등)는 한국어 URL 하나만 넣는다.
//     번역판이 없는데 /en/... 을 넣으면 중복 콘텐츠를 제출하는 셈이다.
import { SITE_URL, localeUrl, hreflangAlternates } from "../lib/seo.js";
import { POSTS } from "../lib/posts.js";
import { locales, defaultLocale, isKoOnly } from "../i18n/routing.js";

// 페이지가 늘어나면 여기에 추가한다. lastModified 는 배포 시각으로 잡는다.
// 블로그 글은 posts.js 에서 자동으로 들어간다 — 글을 추가하면 sitemap 도 같이 늘어난다.
const ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap() {
  const now = new Date();

  const staticRoutes = ROUTES.flatMap((r) => {
    // 번역이 없는 페이지 → 한국어 URL 하나만.
    if (isKoOnly(r.path)) {
      return [
        {
          url: localeUrl(defaultLocale, r.path),
          lastModified: now,
          changeFrequency: r.changeFrequency,
          priority: r.priority,
        },
      ];
    }
    const languages = hreflangAlternates(r.path);
    return locales.map((locale) => ({
      url: localeUrl(locale, r.path),
      lastModified: now,
      changeFrequency: r.changeFrequency,
      // 한국어가 아직 주력 시장이므로 기본 로케일에 가중치를 남겨둔다.
      priority: locale === defaultLocale ? r.priority : r.priority * 0.9,
      alternates: { languages },
    }));
  });

  // 블로그 글은 한국어 원문뿐이다.
  const postRoutes = POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
