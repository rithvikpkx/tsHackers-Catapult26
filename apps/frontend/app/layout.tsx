import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grind",
  description: "Predictive academic execution system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink" suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
