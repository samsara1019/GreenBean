// /robots.txt 자동 생성 (Next.js App Router 파일 컨벤션).
//
// 대시보드·API·인증 경로는 색인 대상이 아니다(로그인 필수라 크롤러엔 빈 페이지로
// 보이고, 색인되면 검색결과 품질만 떨어진다).
import { SITE_URL } from "../lib/seo.js";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/auth/", "/login"],
      },
      // 네이버 크롤러. 별도 규칙이 없어도 위 * 규칙을 따르지만, 명시해두면
      // 서치어드바이저의 robots.txt 검증에서 확인이 쉽다.
      { userAgent: "Yeti", allow: "/", disallow: ["/dashboard", "/api/", "/auth/", "/login"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
