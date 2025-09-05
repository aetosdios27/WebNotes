import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Your existing config...
  
  // Add this:
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;