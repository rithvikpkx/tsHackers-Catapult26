type SectionCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  accent?: "default" | "risk" | "safe";
};

export function SectionCard({ title, eyebrow, children, accent = "default" }: SectionCardProps) {
  const borderColor =
    accent === "risk" ? "border-risk/20" : accent === "safe" ? "border-safe/20" : "border-line/90";

  return (
    <section className={`rounded-card border ${borderColor} bg-surface/95 p-6 shadow-soft`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[1.9rem] font-semibold tracking-[-0.05em]">{title}</h2>
        {eyebrow ? <p className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-muted">{eyebrow}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
