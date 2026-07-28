// 인증 — Supabase Auth(Google OAuth) 세션 쿠키에서 실제 user.id 를 읽는다.
//
// 왜 중요한가: 14일 체험과 연결된 Slack 토큰은 전부 user_id 로 스코핑된다.
// user_id 가 진짜가 아니면 (a) 누가 며칠째 체험 중인지 알 수 없고
// (b) 남의 토큰 대시보드가 그대로 보인다.
//
// 로컬 개발 폴백: NEXT_PUBLIC_SUPABASE_* 가 없고 프로덕션이 아니면 DEV_USER_ID
// 단일 사용자로 동작한다(세팅 0으로 대시보드를 열어보기 위한 것). 프로덕션에서
// 인증 미설정이면 폴백하지 않고 예외를 던진다 — 조용히 전원 공유되는 사고 방지.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_CONFIGURED, createRouteSupabase } from "./supabase-auth.js";

const IS_PROD = process.env.NODE_ENV === "production";

export const DEV_FALLBACK = !AUTH_CONFIGURED && !IS_PROD;

// 로그인한 Supabase 사용자. 없으면 null.
export async function getUser() {
  if (!AUTH_CONFIGURED) {
    if (IS_PROD) {
      throw new Error(
        "인증이 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요."
      );
    }
    // 개발 폴백 — 실제 세션이 아니라 고정 사용자.
    return { id: process.env.DEV_USER_ID || "dev-user", email: "dev@localhost" };
  }
  const supabase = createRouteSupabase(cookies());
  // getUser() 는 쿠키를 신뢰하지 않고 Auth 서버에 검증을 요청한다.
  // (getSession() 은 위조 가능한 쿠키를 그대로 믿으므로 서버에서 쓰지 말 것.)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}

// 로그인한 사용자의 id. 미로그인이면 null.
export async function getUserId() {
  const user = await getUser();
  return user?.id || null;
}

// 라우트 핸들러용 가드.
//   const { userId, response } = await requireUserId();
//   if (response) return response;         // 401
export async function requireUserId() {
  const userId = await getUserId();
  if (!userId) {
    return {
      userId: null,
      response: NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      ),
    };
  }
  return { userId, response: null };
}
