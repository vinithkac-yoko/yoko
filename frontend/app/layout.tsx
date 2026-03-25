import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yoko — Chat + Pattern Canvas",
  description: "Chat-driven Seamly2D pattern editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
