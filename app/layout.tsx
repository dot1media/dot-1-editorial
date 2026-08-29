import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "Dot 1 News · Editorial",
  description: "The Dot 1 News editorial portal: standards, newsroom workflow, and publishing.",
  robots: { index: false, follow: false },
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
      </head>
      <body>{children}</body>
    </html>
  );
}
