// 루트 레이아웃. 모든 페이지가 [locale] 아래에 있으므로 <html> 은 여기서 낸다.
// (app/layout.js 는 없다 — 있으면 <html> 이 이중으로 렌더된다.)

import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Plus_Jakarta_Sans, DM_Sans, Fira_Code } from "next/font/google";
import "../globals.css";
import {
  SITE_URL,
  SITE_NAME,
  KEYWORDS,
  OG_IMAGE,
  hreflangAlternates,
  localeUrl,
} from "../../lib/seo.js";
import { locales, HTML_LANG, OG_LOCALE } from "../../i18n/routing.js";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-fira",
  display: "swap",
});

// 빌드 시 5개 로케일을 미리 생성한다. 없으면 모든 페이지가 동적 렌더로 떨어진다.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }) {
  if (!locales.includes(locale)) notFound();

  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const { title, description } = messages.landing.meta;

  return {
    // metadataBase 가 있어야 canonical/OG 이미지가 절대 URL로 출력된다.
    // 없으면 Next 가 상대경로를 내보내고 일부 크롤러·SNS가 이를 무시한다.
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      // 하위 페이지는 자기 제목만 쓰면 뒤에 브랜드가 붙는다.
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords: KEYWORDS[locale],
    applicationName: SITE_NAME,
    alternates: {
      canonical: localeUrl(locale, "/"),
      languages: hreflangAlternates("/"),
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      url: localeUrl(locale, "/"),
      siteName: SITE_NAME,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    // 서치 콘솔/서치어드바이저 소유 확인용 메타태그. 값이 없으면 태그가 출력되지 않는다.
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
        ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
        : undefined,
    },
  };
}

export default async function LocaleLayout({ children, params: { locale } }) {
  if (!locales.includes(locale)) notFound();

  // 이 호출이 있어야 하위 서버 컴포넌트가 정적 렌더에서도 로케일을 안다.
  setRequestLocale(locale);

  // 클라이언트 컴포넌트에도 번역이 필요하다. 단 전체 카탈로그를 내려보내면
  // 모든 페이지 HTML에 5개 로케일치 중 하나가 통째로 직렬화돼 실린다 —
  // 실제로 클라이언트에서 쓰는 네임스페이스만 골라 보낸다.
  // (언어 선택기 → common, 로그인 화면 → login)
  const all = await getMessages();
  const messages = { common: all.common, login: all.login };

  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${jakarta.variable} ${dmSans.variable} ${firaCode.variable}`}
    >
      <body>
        {/* locale 을 반드시 넘긴다. 빼면 클라이언트의 useLocale() 이 컨텍스트에서
            찾지 못해 useParams() 폴백 경로로 떨어지고, 그 과정에서 정적 렌더가
            클라이언트 렌더로 bailout 되어 컴포넌트가 서버 HTML에서 사라진다. */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
