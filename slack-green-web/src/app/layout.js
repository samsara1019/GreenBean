import { Plus_Jakarta_Sans, DM_Sans, Fira_Code } from "next/font/google";
import "./globals.css";

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
  title: "AlwaysGreen — 자리를 비워도 초록불 유지",
  description:
    "PC를 꺼도 Slack 상태를 근무시간에 맞춰 자동으로 초록불(활성)로 유지해주는 서비스.",
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
