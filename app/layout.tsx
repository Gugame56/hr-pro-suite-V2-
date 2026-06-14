import "./globals.css";
import type { Viewport } from "next";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "HR Pro Suite",
  description: "Next-Gen HR OS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
