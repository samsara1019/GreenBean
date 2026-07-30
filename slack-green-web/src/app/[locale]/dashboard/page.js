// 서버 컴포넌트 — 세션에서 사용자를 확인하고 UI에 넘긴다.
// (미로그인 차단은 middleware 가 먼저 하지만, 직접 렌더될 경우를 대비해 한 번 더.)
//
// ⚠️ 대시보드 UI 문자열은 아직 한국어다. 로케일 라우팅만 먼저 잡았으므로
// /en/dashboard 도 열리지만 화면은 한국어로 나온다. (TODO: dashboard 번역)

import { setRequestLocale } from "next-intl/server";
import { getUser, DEV_FALLBACK } from "../../../lib/auth.js";
import { redirect } from "../../../i18n/navigation.js";
import { defaultLocale } from "../../../i18n/routing.js";
import { pageMetadata } from "../../../lib/seo.js";
import DashboardClient from "./dashboard-client.js";

export const dynamic = "force-dynamic";

export function generateMetadata({ params: { locale } }) {
  return pageMetadata({
    locale,
    title: "대시보드",
    path: "/dashboard",
    // 로그인이 필요한 화면 — robots.txt 와 맞춰 색인하지 않는다.
    noindex: true,
  });
}

export default async function DashboardPage({ params: { locale } }) {
  setRequestLocale(locale);

  const user = await getUser();
  // 로케일을 유지해서 로그인으로 보낸다 — /en/dashboard 로 왔다면 /en/login 으로.
  if (!user) {
    const prefix = locale === defaultLocale ? "" : `/${locale}`;
    redirect({ href: `/login?next=${prefix}/dashboard`, locale });
  }

  return <DashboardClient email={user.email || ""} devFallback={DEV_FALLBACK} />;
}
