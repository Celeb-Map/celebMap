import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kakaoMapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export const metadata: Metadata = {
  title: "CelebMap — 셀럽 추천 맛집 여행",
  description: "좋아하는 셀럽이 다녀간 맛집을 찾고, 나만의 여행 코스를 만들어보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-plum-50">
        <div className="flex-1 w-full flex items-center justify-center">
          {children}
        </div>
        {kakaoMapKey && (
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoMapKey)}&autoload=false`}
            strategy="beforeInteractive"
          />
        )}
      </body>
    </html>
  );
}
