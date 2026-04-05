import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-0 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-10">
      <header className="relative mb-8 flex flex-col gap-4 rounded-card border border-line/80 bg-surface/90 px-5 py-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/onboarding" className="text-xl font-semibold tracking-[-0.04em]">
            Grind
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Required setup</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted">
          First-run access gate
        </div>
      </header>
      {children}
    </div>
  );
}
