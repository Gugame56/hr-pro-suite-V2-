import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
