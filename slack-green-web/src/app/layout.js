import { Plus_Jakarta_Sans, DM_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, KEYWORDS, DEFAULT_DESCRIPTION } from "../lib/seo.js";

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

export const metadata = {
  // metadataBase 가 있어야 canonical/OG 이미지가 절대 URL로 출력된다.
  // 없으면 Next 가 상대경로를 내보내고 일부 크롤러·SNS가 이를 무시한다.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "슬랙 초록불 유지 자동화 — Green Bean",
    // 하위 페이지는 자기 제목만 쓰면 뒤에 브랜드가 붙는다.
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "슬랙 초록불 유지 자동화 — Green Bean",
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "슬랙 초록불 유지 자동화 — Green Bean",
    description: DEFAULT_DESCRIPTION,
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

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${jakarta.variable} ${dmSans.variable} ${firaCode.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
