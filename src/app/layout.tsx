import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "여긴뭐가 | 우리 동네를 채우는 가장 즐거운 상상",
  description: "내가 사랑하는 동네의 비어있는 공간에 새로운 꿈을 채워보세요.",
  metadataBase: new URL("https://여긴뭐가.kr"),
  openGraph: {
    title: "여긴뭐가 | 우리 동네를 채우는 가장 즐거운 상상",
    description: "내가 사랑하는 동네의 비어있는 공간에 새로운 꿈을 채워보세요.",
    url: "/",
    siteName: "여긴뭐가",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "여긴뭐가 서비스 로고",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "여긴뭐가 | 우리 동네를 채우는 가장 즐거운 상상",
    description: "내가 사랑하는 동네의 비어있는 공간에 새로운 꿈을 채워보세요.",
    images: ["/images/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full overflow-hidden antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="stylesheet" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col m-0 p-0 overflow-hidden bg-slate-950 text-white font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
