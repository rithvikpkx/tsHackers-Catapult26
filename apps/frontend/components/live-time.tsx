"use client";

import { useEffect, useState } from "react";
import { formatShortDate } from "@/lib/grind/ui/format";

type LiveTimeProps = {
  value: string;
  variant?: "inline" | "stacked";
  semantics?: "due" | "generic";
  className?: string;
  detailClassName?: string;
  intervalMs?: number;
};

function buildRelativeLabel(targetIso: string, now: number, semantics: LiveTimeProps["semantics"]): string | null {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) {
    return null;
  }

  const differenceMinutes = Math.round((target - now) / 60_000);
  const isPast = differenceMinutes < 0;
  const absoluteMinutes = Math.max(0, Math.abs(differenceMinutes));

  if (absoluteMinutes <= 1) {
    return semantics === "due" ? "due now" : "now";
  }

  const days = Math.floor(absoluteMinutes / (24 * 60));
  const hours = Math.floor((absoluteMinutes % (24 * 60)) / 60);
  const minutes = absoluteMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 && parts.length < 2) {
    parts.push(`${hours}h`);
  }
  if (days === 0 && minutes > 0 && parts.length < 2) {
    parts.push(`${minutes}m`);
  }

  const compactDuration = parts.join(" ");
  if (!compactDuration) {
    return semantics === "due" ? "due now" : "now";
  }

  if (isPast) {
    return semantics === "due" ? `${compactDuration} overdue` : `${compactDuration} ago`;
  }

  return `in ${compactDuration}`;
}

function buildToneClass(targetIso: string, now: number): string {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) {
    return "text-muted";
  }

  const differenceMinutes = Math.round((target - now) / 60_000);
  if (differenceMinutes <= 0) {
    return "text-risk";
  }
  if (differenceMinutes <= 6 * 60) {
    return "text-risk";
  }
  if (differenceMinutes <= 24 * 60) {
    return "text-accent";
  }
  return "text-muted";
}

export function LiveTime({
  value,
  variant = "stacked",
  semantics = "due",
  className,
  detailClassName,
  intervalMs = 30_000,
}: LiveTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs]);

  const absoluteLabel = formatShortDate(value);
  const relativeLabel = mounted ? buildRelativeLabel(value, now, semantics) : null;
  const toneClass = detailClassName ?? (mounted ? buildToneClass(value, now) : "text-muted");

  if (variant === "inline") {
    return (
      <span className={className}>
        <span>{absoluteLabel}</span>
        {relativeLabel ? <span className={`ml-1 text-xs uppercase tracking-[0.12em] ${toneClass}`}>{relativeLabel}</span> : null}
      </span>
    );
  }

  return (
    <div className={className}>
      <div>{absoluteLabel}</div>
      {relativeLabel ? <div className={`mt-1 text-[11px] uppercase tracking-[0.14em] ${toneClass}`}>{relativeLabel}</div> : null}
    </div>
  );
}
