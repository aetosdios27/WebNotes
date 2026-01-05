import type { NextConfig } from "next";
// @ts-expect-error - next-pwa doesn't have updated types for Next.js 15
import withPWAInit from "next-pwa";

const isDesktopBuild = process.env.NEXT_PUBLIC_IS_DESKTOP === "true";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || !isDesktopBuild, // ADD THIS: disable PWA on Vercel
});

const nextConfig: NextConfig = {
  output: isDesktopBuild ? "export" : undefined,
  images: {
    unoptimized: true,
    domains: ["lh3.googleusercontent.com"],
  },
};

export default withPWA(nextConfig);
