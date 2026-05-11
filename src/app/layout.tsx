import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "여긴뭐가 | 우리 동네를 채우는 가장 즐거운 상상",
  description: "내가 사랑하는 동네의 비어있는 공간에 새로운 꿈을 채워보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col m-0 p-0 overflow-hidden bg-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}
