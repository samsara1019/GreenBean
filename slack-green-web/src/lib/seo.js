// SEO 공통 설정 (다국어).
//
// SITE_URL 은 canonical/sitemap/OG 에 절대 URL로 들어간다. 잘못되면 검색엔진이
// 엉뚱한 주소를 색인하므로 배포 도메인과 반드시 일치해야 한다.
// (커스텀 도메인을 붙이면 NEXT_PUBLIC_SITE_URL 만 바꾸고 재배포하면 된다.)

import {
  locales,
  defaultLocale,
  HREFLANG,
  OG_LOCALE,
  isKoOnly,
} from "../i18n/routing.js";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://green-bean-nu.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "Green Bean";

// 로케일별로 노리는 검색어. **번역이 아니라 그 언어권 사람이 실제로 검색창에
// 치는 표현**이어야 한다 — 한국어 "초록불"을 영어로 옮긴 "green light" 는
// 아무도 검색하지 않고, 영어권은 "green dot", 일본어권은 「離席」로 검색한다.
export const KEYWORDS = {
  ko: [
    "슬랙 초록불",
    "슬랙 초록불 유지",
    "슬랙 상태 유지",
    "슬랙 활성 상태 유지",
    "슬랙 자리비움 방지",
    "슬랙 부재중 해제",
    "슬랙 away 방지",
    "Slack 초록불",
    "Slack 상태 자동 유지",
    "Slack presence 유지",
    "슬랙 자동화",
    "재택근무 슬랙 상태",
  ],
  en: [
    "keep slack active",
    "slack always active",
    "slack green dot",
    "stop slack going away",
    "slack away status fix",
    "slack presence automation",
    "keep slack status green",
    "prevent slack idle",
    "slack active hours",
    "remote work slack status",
  ],
  ja: [
    "Slack 離席にならない",
    "Slack アクティブ 維持",
    "Slack 離席 解除",
    "Slack 在席 維持",
    "Slack ステータス 自動",
    "Slack 緑 マーク 維持",
    "Slack アイドル 防止",
    "リモートワーク Slack ステータス",
    "Slack 勤務時間 自動化",
  ],
  pt: [
    "manter slack ativo",
    "slack sempre online",
    "slack status ausente",
    "evitar ausente no slack",
    "bolinha verde slack",
    "manter slack verde",
    "status slack automatico",
    "home office slack status",
    "slack presenca automatica",
  ],
  es: [
    "mantener slack activo",
    "slack siempre en linea",
    "slack estado ausente",
    "evitar ausente en slack",
    "punto verde slack",
    "mantener slack en verde",
    "estado slack automatico",
    "trabajo remoto slack estado",
    "slack presencia automatica",
  ],
};

// 로케일 접두사가 붙은 경로. 기본 로케일(한국어)은 접두사가 없다 —
// 기존에 색인된 /, /blog, /guide URL을 그대로 유지하기 위한 규칙이다.
export function localePath(locale, path = "/") {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const clean = path === "/" ? "" : path.replace(/\/+$/, "");
  return `${prefix}${clean}` || "/";
}

export function localeUrl(locale, path = "/") {
  return `${SITE_URL}${localePath(locale, path)}`;
}

// hreflang 묶음. 같은 페이지의 모든 언어판을 서로 가리키게 해야 구글이
// "번역판"으로 인식한다. 어느 언어에도 매칭되지 않는 방문자에게는
// x-default(한국어)를 준다.
export function hreflangAlternates(path = "/") {
  const languages = {};
  for (const locale of locales) {
    for (const tag of HREFLANG[locale]) {
      languages[tag] = localeUrl(locale, path);
    }
  }
  languages["x-default"] = localeUrl(defaultLocale, path);
  return languages;
}

// 페이지별 metadata 생성기.
//
// 한국어 원문만 있는 페이지(약관·환불·개인정보·블로그)는 다른 로케일에서도
// 렌더되지만 canonical 을 한국어 URL로 돌리고 noindex 를 건다. 번역 없이
// 색인되면 중복 콘텐츠로 깎이고, 법률 문서는 오역 자체가 리스크다.
export function pageMetadata({
  locale = defaultLocale,
  title,
  description,
  path = "/",
  noindex = false,
}) {
  const url = localeUrl(locale, path);
  const untranslated = isKoOnly(path) && locale !== defaultLocale;
  const hidden = noindex || untranslated;

  return {
    title,
    description,
    keywords: KEYWORDS[locale] || KEYWORDS[defaultLocale],
    alternates: {
      canonical: untranslated ? localeUrl(defaultLocale, path) : url,
      // 번역판이 없는 페이지에 hreflang 을 붙이면 존재하지 않는 언어판을
      // 약속하는 셈이 된다.
      ...(isKoOnly(path) ? {} : { languages: hreflangAlternates(path) }),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale] || OG_LOCALE[defaultLocale],
      type: "website",
    },
    ...(hidden ? { robots: { index: false, follow: true } } : {}),
  };
}
