import type { Metadata } from "next";
import "./globals.css";
import PWA from "@/components/PWA";

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#141210" };

export const metadata: Metadata = {
  title: "Dot 1 News · Editorial",
  description: "The Dot 1 News editorial portal: standards, newsroom workflow, and publishing.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/dot1-news-icon-192.png?v=1", type: "image/png" },
    ],
    apple: "/dot1-news-icon-192.png?v=1",
  },
  appleWebApp: { capable: true, title: "Newsroom", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600;6..96,700;6..96,800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#141210" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <PWA />
      </body>
    </html>
  );
}
