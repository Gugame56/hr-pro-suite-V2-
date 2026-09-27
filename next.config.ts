import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://vruancgpqtdhaauugwme.supabase.co wss://vruancgpqtdhaauugwme.supabase.co https://maps.googleapis.com https://*.googleapis.com https://api.qrserver.com;
  media-src 'self' blob: data: https:;
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  // ปิดการเปิดเผยเทคโนโลยีของเซิร์ฟเวอร์ (CWE-200)
  poweredByHeader: false,
  // ปักหมุด root ไว้ที่โฟลเดอร์โปรเจกต์ ไม่ให้ Next ไปสับสนกับ lockfile ใน home dir
  outputFileTracingRoot: __dirname,
  // Prevent webpack from bundling Node-only packages — fixes "Can't resolve 'node-domexception'"
  serverExternalPackages: [
    'googleapis',
    'googleapis-common',
    'google-auth-library',
    'gaxios',
    'node-fetch',
    'fetch-blob',
    'node-domexception',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), geolocation=(self), microphone=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
