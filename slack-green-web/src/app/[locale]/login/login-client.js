"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation.js";
import { defaultLocale } from "../../../i18n/routing.js";
import {
  AUTH_CONFIGURED,
  createBrowserSupabase,
} from "../../../lib/supabase-browser.js";

// ⚠️ useSearchParams() 를 쓰지 않는다. 그 훅은 정적 렌더에서 Suspense 경계를
//요구해 카드 전체가 서버 HTML에서 빠지고(첫 페인트에 빈 화면), 로그인은
// 전환의 마지막 단계라 그 깜빡임의 대가가 크다. 쿼리스트링은 마운트 후
// window.location 에서 읽는다 — SSR 초기값과 일치하므로 하이드레이션도 안전하다.
export default function LoginClient() {
  const t = useTranslations("login");
  const locale = useLocale();
  // ⚠️ next 는 OAuth 콜백이 최종적으로 보내줄 경로다. 로케일 접두사가 빠지면
  // 영어로 가입한 사용자가 한국어 대시보드로 떨어진다.
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const [next, setNext] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next"));
    setErr(params.get("error") || "");
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    setErr("");
    try {
      const supabase = createBrowserSupabase();
      const target = next || `${prefix}/dashboard`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // 성공 시 구글로 이동하므로 여기 아래는 실행되지 않는다.
    } catch (e) {
      setBusy(false);
      setErr(e.message || t("failed"));
    }
  }

  const bold = { b: (chunks) => <strong>{chunks}</strong> };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link className="brand" href="/">
          <span className="dot" /> Green Bean
        </Link>

        <div className="auth-head">
          <h1>{t("title")}</h1>
          <p className="muted">{t.rich("sub", bold)}</p>
        </div>

        {!AUTH_CONFIGURED ? (
          <div className="notice" style={{ marginBottom: 16 }}>
            <span aria-hidden="true">🛠</span>
            <p style={{ margin: 0 }}>
              {t.rich("devMode", bold)}{" "}
              <Link href="/dashboard">{t("devModeLink")}</Link>
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
              {busy ? t("googleBusy") : t("google")}
            </button>
          </>
        )}

        <ul className="auth-points">
          <li>{t("p1")}</li>
          <li>{t("p2")}</li>
          <li>{t("p3")}</li>
        </ul>

        <p className="auth-legal">{t("legal")}</p>
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
