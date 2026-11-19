import type { Metadata } from "next";
import { Reem_Kufi, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const reem = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-reem",
  display: "swap",
});

const plexAr = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-ar",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "الفهرس الإشعاعي — فيزياء الإشعاع في علوم المادة SM",
  description:
    "فهرس مفتوح ومتجدد لمصادر فيزياء الإشعاع في علوم المادة: إشعاع المواد، زرع الأيونات، توصيل النيوترونات والأشعة، وقواعد بيانات المواد — بالعربية والفرنسية والإنجليزية، مع بحث وتحقق من الروابط وإضافة مراجع كل ساعة.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${reem.variable} ${plexAr.variable} ${plexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
