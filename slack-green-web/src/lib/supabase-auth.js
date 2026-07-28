// Supabase Auth 클라이언트 팩토리 (Google OAuth).
//
// ⚠️ 데이터 접근(db.js)과 인증(여기)은 키가 다르다:
//   - 인증  : anon 공개키 + 쿠키 세션  → 브라우저/미들웨어/서버 모두 사용
//   - 데이터: service_role 시크릿 키   → 서버에서만, user_id로 직접 스코핑
// 이렇게 나눠야 브라우저에 시크릿이 새지 않으면서 서버는 RLS 우회로 워커와
// 같은 테이블을 다룰 수 있다.

// 브라우저용 클라이언트는 supabase-browser.js 에 따로 있다.

import { createServerClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 인증이 설정돼 있는지. 없으면 로컬 개발 모드(단일 DEV 사용자)로 폴백한다.
export const AUTH_CONFIGURED = Boolean(URL && ANON);

// 서버 컴포넌트 / 라우트 핸들러용. next/headers 의 cookies() 를 넘긴다.
// 서버 컴포넌트에서는 쿠키 쓰기가 막혀 있어 set 이 throw 하므로 무시한다
// (세션 갱신은 middleware 가 담당).
export function createRouteSupabase(cookieStore) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookies) {
        try {
          cookies.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* 서버 컴포넌트에서 호출된 경우 — middleware 가 갱신한다 */
        }
      },
    },
  });
}

// middleware 용. 요청 쿠키를 읽고 갱신된 세션 쿠키를 응답에 실어 보낸다.
export function createMiddlewareSupabase(request, response) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
