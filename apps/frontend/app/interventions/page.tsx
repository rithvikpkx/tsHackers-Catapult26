import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";
import { formatPercent, formatShortDate } from "@/lib/grind/ui/format";

export default async function InterventionsPage() {
  const snapshot = await loadScenario();

  return (
    <main className="space-y-5">
      <section className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Interventions</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">Schedule changes with a clear reason.</h1>
      </section>

      <SectionCard title="Current proposal" eyebrow="Mirrored calendar writeback" accent="safe">
        {snapshot.intervention ? (
          <div className="space-y-4">
            <p className="text-lg font-semibold">{snapshot.intervention.summaryText}</p>
            <p className="text-sm leading-6 text-muted">{snapshot.intervention.rationaleText}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Before</p>
                <p className="mt-1 text-xl font-semibold">{formatPercent(snapshot.intervention.successProbabilityBefore)}</p>
              </div>
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">After</p>
                <p className="mt-1 text-xl font-semibold text-safe">{formatPercent(snapshot.intervention.successProbabilityAfter)}</p>
              </div>
            </div>
            <div className="space-y-3">
              {snapshot.intervention.calendarChanges.map((change) => (
                <div key={change.id} className="rounded-3xl border border-line bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{change.title}</p>
                    <span className="text-xs uppercase tracking-[0.14em] text-muted">{change.changeType.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{change.detail}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatShortDate(change.startsAt)} to {formatShortDate(change.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No intervention is needed right now.</p>
        )}
      </SectionCard>
    </main>
  );
}
