import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "HR Pro Suite",
  description: "Next-Gen HR OS",
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
