"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const AUTO_REFRESH_PATHS = [/^\/$/, /^\/tasks(?:\/|$)/, /^\/focus(?:\/|$)/, /^\/interventions(?:\/|$)/, /^\/profile(?:\/|$)/];

function shouldAutoRefresh(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return AUTO_REFRESH_PATHS.some((pattern) => pattern.test(pathname));
}

function isUserEditing(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return false;
  }

  const tagName = activeElement.tagName;
  return activeElement.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

export function LiveRefresh({ intervalMs = DEFAULT_REFRESH_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldAutoRefresh(pathname)) {
      return;
    }

    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      if (isUserEditing()) {
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    };

    const intervalId = window.setInterval(() => {
      refresh();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, pathname, router]);

  return null;
}
