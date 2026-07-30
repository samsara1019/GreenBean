// /sitemap.xml 자동 생성. 구글 서치 콘솔·네이버 서치어드바이저에 이 URL을 제출한다.
//
// 로그인이 필요한 경로(/dashboard, /login)는 넣지 않는다 — 크롤러에겐 내용이 없는
// 페이지라 넣어도 색인되지 않고, robots.txt 와 모순만 생긴다.
import { SITE_URL } from "../lib/seo.js";

// 페이지가 늘어나면 여기에 추가한다. lastModified 는 배포 시각으로 잡는다.
const ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap() {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
