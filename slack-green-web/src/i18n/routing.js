// 로케일 라우팅 정의 — 여기가 다국어의 단일 진실 공급원이다.
//
// URL 세그먼트는 짧은 언어 코드만 쓴다(/en, /ja, /pt, /es). 지역 변형을
// URL에 넣지 않는 이유:
//   - /pt-BR 처럼 대문자가 섞이면 대소문자 불일치 404가 실전에서 반드시 난다
//   - es-419(중남미)는 URL로 쓰기엔 의미 전달이 안 된다
// 대신 "어느 지역을 노리는가"는 hreflang 으로 정확히 알린다 (HREFLANG 참고).
//
// localePrefix: "as-needed" — 한국어(기본)는 접두사 없이 기존 URL을 그대로
// 유지한다. 이미 서치 콘솔에 색인된 /, /blog, /guide 를 깨뜨리지 않는 것이
// 이 설정의 목적이다. 새 언어만 /en, /ja … 를 갖는다.

import { defineRouting } from "next-intl/routing";

export const locales = ["ko", "en", "ja", "pt", "es"];
export const defaultLocale = "ko";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  // 쿠키(NEXT_LOCALE)로 마지막 선택을 기억한다. Accept-Language 자동 감지도
  // 켜둔다 — 해외 유입이 목적이므로 첫 방문에 모국어를 보여주는 편이 낫다.
  localeDetection: true,
});

// 한 로케일이 커버하는 hreflang 태그들. 짧은 코드(언어 전체)와 지역 정제형을
// 함께 내보낸다 — es 만 내보내면 중남미 타겟팅 신호가 없고, es-419 만
// 내보내면 스페인 사용자가 매칭에 실패해 x-default(한국어)로 떨어진다.
export const HREFLANG = {
  ko: ["ko", "ko-KR"],
  en: ["en"],
  ja: ["ja", "ja-JP"],
  pt: ["pt", "pt-BR"],
  es: ["es", "es-419"],
};

// Open Graph 의 og:locale 은 language_TERRITORY 형식만 받는다.
export const OG_LOCALE = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  pt: "pt_BR",
  es: "es_LA",
};

// <html lang> 값. 검색엔진·스크린리더가 읽는다.
export const HTML_LANG = {
  ko: "ko-KR",
  en: "en",
  ja: "ja-JP",
  pt: "pt-BR",
  es: "es-419",
};

// 언어 선택기에 보여줄 이름. 각 언어의 모국어 표기를 쓴다 —
// "Japanese" 보다 "日本語" 가 그 언어 사용자에게 즉시 읽힌다.
export const LOCALE_LABEL = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  pt: "Português (BR)",
  es: "Español (LatAm)",
};

// 아직 한국어 원문만 있는 페이지(약관·환불·개인정보·블로그). 다른 로케일에서도
// 렌더는 되지만 canonical 을 한국어 URL로 보내고 noindex 처리한다 —
// 번역 없이 색인되면 중복 콘텐츠로 평가되고, 법률 문서는 오역 자체가 리스크다.
export const KO_ONLY_PATHS = ["/terms", "/privacy", "/refund", "/blog"];

export function isKoOnly(path) {
  return KO_ONLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}
