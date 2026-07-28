// Google OAuth 리다이렉트 착지점.
// Supabase가 ?code=... 를 붙여 여기로 돌려보내면, 코드를 세션 쿠키로 교환하고
// **가입 시점에 14일 체험을 시작**한 뒤 대시보드로 보낸다.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteSupabase, AUTH_CONFIGURED } from "../../../lib/supabase-auth.js";
import { getOrCreateSubscription } from "../../../lib/db.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  // Supabase가 실패를 알려준 경우(동의 거부 등)
  const authError = searchParams.get("error_description") || searchParams.get("error");
  if (authError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError)}`
    );
  }

  if (!AUTH_CONFIGURED || !code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createRouteSupabase(cookies());
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // 가입(=첫 로그인) 시점에 체험 시작. 이미 row가 있으면 그대로 반환되므로
  // 재로그인해도 체험 기간이 리셋되지 않는다.
  const userId = data?.user?.id;
  if (userId) {
    try {
      await getOrCreateSubscription(userId);
    } catch (e) {
      // 체험 row 생성 실패가 로그인 자체를 막지는 않게 한다.
      // 대시보드의 /api/subscription 이 다음 요청에서 다시 시도한다.
      console.error("[auth/callback] 체험 생성 실패:", e);
    }
  }

  // next 는 사용자가 조작할 수 있으므로 내부 경로만 허용 (오픈 리다이렉트 방지).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
