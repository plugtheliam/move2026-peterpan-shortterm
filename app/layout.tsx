import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Move 2026 서울·경기 단기임대 검토판",
  description:
    "피터팬 서울·경기 단기임대 원천 데이터, 실내 사진, 카카오 로드뷰, 지도 링크를 모은 Move 2026 검토 사이트입니다.",
  icons: {
    icon: "/move2026/favicon.svg",
    shortcut: "/move2026/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
