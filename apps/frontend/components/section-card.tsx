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
    <section className={`rounded-card border ${borderColor} bg-surface/95 p-5 shadow-soft`}>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.18em] text-muted">{eyebrow}</p> : null}
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
