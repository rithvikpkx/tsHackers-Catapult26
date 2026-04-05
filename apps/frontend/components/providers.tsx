"use client";

import { SessionProvider } from "next-auth/react";
import { LiveRefresh } from "@/components/live-refresh";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LiveRefresh />
      {children}
    </SessionProvider>
  );
}
