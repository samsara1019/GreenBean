// 서버 컴포넌트가 매 요청마다 읽는 i18n 설정. next.config.mjs 의
// createNextIntlPlugin 이 이 파일 경로를 가리킨다.

import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./routing.js";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale 은 [locale] 세그먼트에서 온다. 미들웨어가 잘못된 값을 걸러
  // 주지만, 라우트를 직접 렌더하는 경로(예: not-found)에서는 undefined 가 올
  // 수 있으므로 기본값으로 떨어뜨린다.
  const requested = await requestLocale;
  const locale = locales.includes(requested) ? requested : defaultLocale;

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // 메시지 파일이 없으면 로케일이 잘못된 것이다 — 조용히 한국어로 폴백하면
    // 빈 화면 대신 엉뚱한 언어가 나가므로 404 가 정직하다.
    notFound();
  }

  return {
    locale,
    messages,
    // 번역 키가 빠졌을 때 빌드를 멈추지 않고 키 이름을 그대로 노출한다.
    // 로케일이 5개라 누락은 반드시 생기고, 그때 페이지 전체가 죽는 것이
    // 최악이다. 개발 중에는 콘솔로 잡는다.
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.warn(error.message);
    },
    getMessageFallback({ key }) {
      return key.split(".").pop();
    },
  };
});
