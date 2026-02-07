/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // WARNING: Do NOT include /api suffix - it's automatically added by lib/api.ts
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Fix Railway deployment - ensure standalone output includes all routes
  output: 'standalone',
  // Ensure admin routes are generated at build time
  outputFileTracingIncludes: {
    '/admin/**/*': ['./app/admin/**/*'],
  },
  // Silence turbopack workspace root warning
  turbopack: {
    root: require('path').resolve(__dirname, '..'),
  },
};

module.exports = nextConfig;
