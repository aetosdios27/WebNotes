import type { NextConfig } from "next";
// @ts-expect-error - next-pwa doesn't have updated types for Next.js 15
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Checks if we are building the final .exe
const isDesktopBuild = process.env.NEXT_PUBLIC_IS_DESKTOP === "true";

const nextConfig: NextConfig = {
  // Only force static export when building the executable.
  // In dev mode, let the server run to handle API routes.
  output: isDesktopBuild ? "export" : undefined,

  images: {
    unoptimized: true,
    domains: ["lh3.googleusercontent.com"],
  },
};

export default withPWA(nextConfig);
