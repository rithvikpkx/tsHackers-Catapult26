import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Grind",
  description: "Academic operator for risk-aware scheduling"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

