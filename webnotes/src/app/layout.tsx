import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/Providers";
import { Toaster } from "@/app/components/ui/sonner"; // 1. Import the Toaster

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WebNotes",
  description: "A simple, beautiful note-taking app.",
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster /> {/* 2. Add the Toaster here */}
      </body>
    </html>
  );
}