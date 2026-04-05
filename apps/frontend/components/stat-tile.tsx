import type { ReactNode } from "react";

type StatTileProps = {
  label: string;
  value: ReactNode;
  tone?: "default" | "risk" | "safe";
  size?: "default" | "compact";
};

export function StatTile({ label, value, tone = "default", size = "default" }: StatTileProps) {
  const valueTone = tone === "risk" ? "text-risk" : tone === "safe" ? "text-safe" : "text-ink";
  const surfaceTone =
    tone === "risk"
      ? "bg-[linear-gradient(180deg,rgba(185,65,46,0.09),rgba(255,255,255,0.72))]"
      : tone === "safe"
        ? "bg-[linear-gradient(180deg,rgba(44,122,75,0.09),rgba(255,255,255,0.72))]"
        : "bg-[linear-gradient(180deg,rgba(31,75,153,0.06),rgba(255,255,255,0.72))]";
  const symbolTone =
    tone === "risk" ? "bg-risk/15 text-risk" : tone === "safe" ? "bg-safe/15 text-safe" : "bg-accent/12 text-accent";
  const containerSize = size === "compact" ? "min-h-[8.7rem] px-4 py-3" : "min-h-32 px-5 py-4";
  const labelSize = size === "compact" ? "max-w-[9ch] text-[14px] leading-5" : "max-w-[10ch] text-[15px] leading-6";
  const valueSize = size === "compact" ? "mt-4 text-[1.9rem]" : "mt-6 text-[2.15rem]";
  const symbolSize = size === "compact" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className={`flex flex-col justify-between rounded-[2rem] border border-white/70 ${containerSize} ${surfaceTone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`${labelSize} text-muted`}>{label}</p>
        <span className={`flex items-center justify-center rounded-full ${symbolSize} ${symbolTone}`}>
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      </div>
      <div className={`${valueSize} font-semibold tracking-[-0.06em] ${valueTone}`}>{value}</div>
    </div>
  );
}
