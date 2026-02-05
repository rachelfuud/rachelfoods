/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure all routes are included in production build
  output: 'standalone',
  env: {
    // WARNING: Do NOT include /api suffix - it's automatically added by lib/api.ts
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Disable static optimization for dynamic admin routes
  experimental: {
    // Ensure dynamic routes are server-rendered
    serverActions: true,
  },
};

module.exports = nextConfig;
