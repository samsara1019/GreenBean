// 서버 래퍼 — metadata 만 담당하고 UI는 클라이언트 컴포넌트에 맡긴다.
// ("use client" 파일에서는 generateMetadata 를 내보낼 수 없다.)

import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "../../../lib/seo.js";
import LoginClient from "./login-client.js";

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "login.meta" });
  return pageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/login",
    // 로그인 페이지는 크롤러에겐 내용이 없다 — robots.txt 와 맞춰 색인하지 않는다.
    noindex: true,
  });
}

export default function LoginPage({ params: { locale } }) {
  setRequestLocale(locale);
  return <LoginClient />;
}
