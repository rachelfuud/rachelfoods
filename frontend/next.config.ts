import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Disable turbopack to avoid Windows resource errors
  experimental: {
    turbo: false,
  },
};

export default nextConfig;
