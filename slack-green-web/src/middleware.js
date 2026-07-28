// 세션 갱신 + /dashboard 보호.
//
// Supabase 세션 토큰은 만료되므로 매 요청마다 갱신해서 응답 쿠키에 다시 심어야
// 한다. 그 일을 하는 곳이 여기다. 겸사겸사 미로그인 사용자가 /dashboard 에
// 들어오면 /login 으로 돌려보낸다 (API 라우트는 각자 401을 반환한다).

import { NextResponse } from "next/server";
import { createMiddlewareSupabase } from "./lib/supabase-auth.js";

const AUTH_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function middleware(request) {
  // 인증 미설정 = 로컬 개발 폴백 모드. 그냥 통과시킨다.
  if (!AUTH_CONFIGURED) return NextResponse.next();

  const response = NextResponse.next({ request });
  const supabase = createMiddlewareSupabase(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // 로그인 후 원래 가려던 곳으로 되돌려 보낸다.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 이미 로그인했으면 로그인 페이지는 건너뛴다.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // 정적 자산과 auth 콜백은 제외 — 콜백은 자기 코드에서 세션을 심는다.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
