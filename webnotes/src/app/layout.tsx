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

const description =
  "A little space for your thoughts. Local-first notes, synced everywhere.";

export const metadata: Metadata = {
  // Absolute URLs for the social card; previews resolve against this.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://web-notes-lyart.vercel.app",
  ),
  title: "WebNotes",
  description,
  openGraph: { title: "WebNotes", description, siteName: "WebNotes", type: "website" },
  twitter: { card: "summary_large_image", title: "WebNotes", description },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101010" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>

      <body
        className={`
          ${GeistSans.variable}
          ${instrument.variable}
          ${jetbrains.variable}
          font-sans antialiased text-ink
        `}
        suppressHydrationWarning
      >
        <Providers>
          {/* APP SHELL */}
          <div className="h-screen flex flex-col overflow-hidden bg-background">
            {/* WINDOW CHROME (never scrolls) */}
            <TitleBar />

            {/* APP CONTENT (owns scrolling) */}
            <div className="flex-1 overflow-hidden">{children}</div>
          </div>

          {/* GLOBAL UI */}
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
