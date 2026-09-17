import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { cookies } from 'next/headers';
import { LanguageProvider } from './components/LanguageProvider';
import { parseLocale } from './lib/locale';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  appleWebApp: { capable: true },
  other: { 'apple-mobile-web-app-capable': 'yes' },
  metadataBase: new URL("https://celeb-map.vercel.app"),
  icons: {
    icon: { url: "/logo_v1.png", type: "image/png" },
  },
  title: "CelebMap — 셀럽 추천 맛집 여행",
  description: "좋아하는 셀럽이 다녀간 맛집을 찾고, 나만의 여행 코스를 만들어보세요.",
  openGraph: {
    type: "website",
    siteName: "CelebMap",
    title: "CelebMap — 셀럽 추천 맛집 여행",
    description: "좋아하는 셀럽이 다녀간 맛집을 찾고, 나만의 여행 코스를 만들어보세요.",
    images: [{
      url: "/celebmap-share-logo-v1.png",
      width: 500,
      height: 500,
      type: "image/png",
      alt: "CelebMap 로고",
    }],
  },
  twitter: {
    card: "summary",
    title: "CelebMap — 셀럽 추천 맛집 여행",
    description: "좋아하는 셀럽이 다녀간 맛집을 찾고, 나만의 여행 코스를 만들어보세요.",
    images: [{ url: "/celebmap-share-logo-v1.png", alt: "CelebMap 로고" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = parseLocale((await cookies()).get('celeb-map-language')?.value);
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-plum-50">
        <div className="flex-1 w-full flex items-center justify-center">
          <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
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
