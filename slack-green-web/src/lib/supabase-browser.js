// 브라우저 전용 Supabase Auth 클라이언트 (Google 로그인 시작에만 사용).
// 서버용 쿠키 핸들러는 supabase-auth.js 에 따로 둔다 — 클라이언트 번들에
// 서버 코드가 섞여 들어가지 않도록.

import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// NEXT_PUBLIC_ 변수는 빌드 타임에 인라인되므로 클라이언트에서도 판별 가능.
export const AUTH_CONFIGURED = Boolean(URL && ANON);

export function createBrowserSupabase() {
  if (!AUTH_CONFIGURED) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다."
    );
  }
  return createBrowserClient(URL, ANON);
}
