export function toPercent(value: number | undefined): string {
  return value === undefined ? "n/a" : `${Math.round(value * 100)}%`;
}

export function riskTone(value: number | undefined): string {
  if (value === undefined) return "bg-stone-200 text-stone-700";
  if (value >= 0.7) return "bg-red-100 text-red-800";
  if (value >= 0.4) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}
