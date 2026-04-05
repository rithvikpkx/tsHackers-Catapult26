import { SectionCard } from "@/components/section-card";
import { StatTile } from "@/components/stat-tile";
import { loadScenario } from "@/app/lib/api";
import { formatPercent, formatShortDate } from "@/lib/grind/ui/format";

export default async function InterventionsPage() {
  const snapshot = await loadScenario();

  return (
    <main className="space-y-5">
      <section className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Interventions</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">Schedule</h1>
      </section>

      <SectionCard title="Current proposal" eyebrow="Mirrored calendar writeback" accent="safe">
        {snapshot.intervention ? (
          <div className="space-y-4">
            <p className="text-lg font-semibold">{snapshot.intervention.summaryText}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile label="Before" value={formatPercent(snapshot.intervention.successProbabilityBefore)} />
              <StatTile label="After" value={formatPercent(snapshot.intervention.successProbabilityAfter)} tone="safe" />
            </div>
            <div className="space-y-3">
              {snapshot.intervention.calendarChanges.map((change) => (
                <div key={change.id} className="rounded-[1.8rem] border border-line bg-white px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{change.title}</p>
                    <span className="text-xs uppercase tracking-[0.14em] text-muted">{change.changeType.replace("_", " ")}</span>
                  </div>
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
