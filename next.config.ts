import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ปักหมุด root ไว้ที่โฟลเดอร์โปรเจกต์ ไม่ให้ Next ไปสับสนกับ lockfile ใน home dir
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
