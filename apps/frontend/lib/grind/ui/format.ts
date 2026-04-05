export function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return "0%";
  }
  return `${Math.round(value * 100)}%`;
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) {
    return "0m";
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) {
    return `${remainder}m`;
  }
  if (remainder === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainder}m`;
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
