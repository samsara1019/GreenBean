// SEO 공통 설정.
//
// SITE_URL 은 canonical/sitemap/OG 에 절대 URL로 들어간다. 잘못되면 검색엔진이
// 엉뚱한 주소를 색인하므로 배포 도메인과 반드시 일치해야 한다.
// (커스텀 도메인을 붙이면 NEXT_PUBLIC_SITE_URL 만 바꾸고 재배포하면 된다.)
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://green-bean-nu.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "Green Bean";

// 노리는 검색어. 실제 사람들이 치는 표현을 그대로 담는다 —
// "슬랙 초록불", "슬랙 자리비움", "슬랙 부재중" 처럼 한글 구어 표현이 핵심이고
// 영문 표기(Slack)도 섞어 쓴다.
export const KEYWORDS = [
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
];

// 검색결과에 그대로 노출되는 문장. 앞부분에 핵심 키워드를 두고, 길이는
// 구글이 잘라내지 않는 선(한글 약 80자 내외)으로 맞춘다.
export const DEFAULT_DESCRIPTION =
  "슬랙 초록불을 근무시간 동안 자동으로 유지합니다. PC를 꺼도, 자리를 비워도 Slack 상태가 활성으로 유지되고 퇴근하면 알아서 꺼집니다. 14일 무료 체험.";

// 페이지별 metadata 생성기. canonical(alternates)까지 같이 넣어 중복 색인을 막는다.
export function pageMetadata({ title, description, path = "/", noindex = false }) {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
