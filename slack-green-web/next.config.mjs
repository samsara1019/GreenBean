import createNextIntlPlugin from "next-intl/plugin";

// 요청별 i18n 설정 파일 위치를 명시한다(기본 관례 경로에 의존하지 않는다).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
