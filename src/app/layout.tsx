import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academic Planner",
  description: "What do I need to do right now?",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
      style={{ colorScheme: 'dark' }}
      data-scroll-behavior="smooth"
    >
      <head>
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
