"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AUTH_CONFIGURED, createBrowserSupabase } from "../../lib/supabase-browser.js";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}

function LoginCard() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [err, setErr] = useState(params.get("error") || "");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    setErr("");
    try {
      const supabase = createBrowserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // 성공 시 구글로 이동하므로 여기 아래는 실행되지 않는다.
    } catch (e) {
      setBusy(false);
      setErr(e.message || "로그인에 실패했습니다.");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link className="brand" href="/">
          <span className="dot" /> Green Bean
        </Link>

        <div className="auth-head">
          <h1>시작하기</h1>
          <p className="muted">
            계정을 만들면 <strong>14일 무료 체험</strong>이 시작됩니다. 카드
            등록은 필요 없습니다.
          </p>
        </div>

        {!AUTH_CONFIGURED ? (
          <div className="notice" style={{ marginBottom: 16 }}>
            <span aria-hidden="true">🛠</span>
            <p style={{ margin: 0 }}>
              <strong>로컬 개발 모드.</strong> Supabase 인증이 설정되지 않아
              단일 개발 사용자로 동작합니다. 바로{" "}
              <Link href="/dashboard">대시보드</Link>로 이동하세요.
            </p>
          </div>
        ) : (
          <>
            {err && (
              <div className="error-text" style={{ marginBottom: 12 }}>
                {err}
              </div>
            )}
            <button
              className="btn btn-lg btn-secondary auth-google"
              onClick={signInWithGoogle}
              disabled={busy}
            >
              <GoogleMark />
              {busy ? "이동 중…" : "Google로 계속하기"}
            </button>
          </>
        )}

        <ul className="auth-points">
          <li>14일간 모든 Pro 기능</li>
          <li>카드 등록 없이 시작</li>
          <li>언제든 해지 가능</li>
        </ul>

        <p className="auth-legal">
          계속하면 자동 상태 유지가 워크스페이스 정책·Slack 이용약관의 영향을
          받을 수 있다는 점에 동의하는 것으로 봅니다. 자격증명은 암호화 저장되며
          메시지 내용에는 접근하지 않습니다.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
