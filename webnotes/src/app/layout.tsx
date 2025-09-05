import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/app/components/Providers"; // 1. Import your new Providers component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WebNotes",
  description: "A simple, beautiful note-taking app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* 2. Wrap children with the new Providers component */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}