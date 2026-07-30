// 로케일 라우팅 + 세션 갱신 + /dashboard 보호.
//
// 미들웨어는 하나뿐이므로(Next 제약) 두 가지를 순서대로 합성한다:
//   1) next-intl — 로케일을 판별해 /en/foo → /[locale]/foo 로 rewrite,
//      필요하면 /(Accept-Language: ja) → /ja 로 redirect
//   2) Supabase — 만료되는 세션 토큰을 갱신해 응답 쿠키에 다시 심는다
//
// ⚠️ 순서가 중요하다. Supabase 는 갱신된 쿠키를 "넘겨받은 response" 에 쓰므로
// intl 이 만든 response 를 그대로 넘겨야 rewrite/redirect 에 쿠키가 같이 실린다.
// 그 뒤에 우리가 새 redirect 를 만들면 쿠키를 직접 옮겨야 한다 (copyCookies).

import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createMiddlewareSupabase } from "./lib/supabase-auth.js";
import { routing, locales, defaultLocale } from "./i18n/routing.js";

const AUTH_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const handleI18n = createIntlMiddleware(routing);

// API·인증 라우트에는 로케일 접두사를 붙이면 안 된다. /api/connections 가
// /ko/api/connections 로 rewrite 되면 라우트가 사라지고, OAuth 콜백은 Google
// 콘솔에 등록된 고정 주소라 접두사가 붙는 순간 로그인이 깨진다.
const BYPASS_I18N = /^\/(api|auth)(\/|$)/;

// URL 에서 로케일 접두사를 떼어낸다. "/en/dashboard" → { locale:"en", rest:"/dashboard" }
// 기본 로케일은 접두사가 없으므로(as-needed) rest 가 pathname 그대로다.
function splitLocale(pathname) {
  const seg = pathname.split("/")[1];
  if (locales.includes(seg)) {
    return { locale: seg, rest: pathname.slice(seg.length + 1) || "/" };
  }
  return { locale: defaultLocale, rest: pathname };
}

// Supabase 가 갱신한 세션 쿠키를 새 응답으로 옮긴다. 빼먹으면 리다이렉트마다
// 세션이 갱신 전 상태로 되돌아가 로그인 루프가 된다.
function copyCookies(from, to) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const response = BYPASS_I18N.test(pathname)
    ? NextResponse.next({ request })
    : handleI18n(request);

  // 인증 미설정 = 로컬 개발 폴백 모드. 로케일 처리만 하고 통과시킨다.
  if (!AUTH_CONFIGURED) return response;

  const supabase = createMiddlewareSupabase(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // intl 이 리다이렉트를 결정했다면(로케일 감지 등) 그 판단을 먼저 따른다.
  // 목적지에서 미들웨어가 다시 돌며 아래 보호 로직이 적용된다.
  if (response.status >= 300 && response.status < 400) return response;

  const { locale, rest } = splitLocale(pathname);
  const prefix = locale === defaultLocale ? "" : `/${locale}`;

  if (!user && rest.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/login`;
    // 로그인 후 원래 가려던 곳으로 — 로케일을 유지한 경로로 되돌려 보낸다.
    url.searchParams.set("next", `${prefix}${rest}`);
    return copyCookies(response, NextResponse.redirect(url));
  }

  // 이미 로그인했으면 로그인 페이지는 건너뛴다.
  if (user && rest === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/dashboard`;
    url.search = "";
    return copyCookies(response, NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  // 정적 자산과 auth 콜백은 제외 — 콜백은 자기 코드에서 세션을 심는다.
  // 확장자가 있는 경로(robots.txt, sitemap.xml, 소유확인 html 등)도 함께 빠진다.
  matcher: [
    "/((?!_next/static|_next/image|_vercel|favicon.ico|auth/callback|.*\\.[^/]+$).*)",
  ],
};
