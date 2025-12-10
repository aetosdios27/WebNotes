import type { NextConfig } from 'next';
// @ts-expect-error - next-pwa doesn't have updated types for Next.js 15
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default withPWA(nextConfig);