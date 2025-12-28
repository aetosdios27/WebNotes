import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

import Providers from "@/app/components/Providers";
import { Toaster } from "@/app/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import TitleBar from "@/app/components/TitleBar";

// Serif: Instrument Serif (display / reading)
const instrument = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// Mono: JetBrains Mono (code)
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WebNotes",
  description: "A simple, beautiful note-taking app.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WebNotes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>

      <body
        className={`
          ${GeistSans.variable}
          ${instrument.variable}
          ${jetbrains.variable}
          font-sans antialiased text-zinc-200
        `}
        suppressHydrationWarning
      >
        {/* APP SHELL */}
        <div className="h-screen flex flex-col overflow-hidden bg-black">
          {/* WINDOW CHROME (never scrolls) */}
          <TitleBar />

          {/* APP CONTENT (owns scrolling) */}
          <div className="flex-1 overflow-hidden">
            <Providers>{children}</Providers>
          </div>
        </div>

        {/* GLOBAL UI */}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
