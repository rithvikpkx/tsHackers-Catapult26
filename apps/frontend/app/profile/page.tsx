import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";

export default async function ProfilePage() {
  const snapshot = await loadScenario();

  return (
    <main className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <SectionCard title="Distortion profile" eyebrow="Behaviorally legible model">
        <div className="grid gap-3 sm:grid-cols-2">
          {snapshot.profile.highlights.map((item) => (
            <div key={item} className="rounded-3xl bg-canvas px-4 py-4">
              <p className="text-sm leading-6 text-muted">{item}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Model factors" eyebrow="Weak priors + observations">
        <div className="space-y-3">
          <div className="rounded-3xl border border-line bg-white px-4 py-3">
            <p className="text-sm text-muted">Confidence</p>
            <p className="mt-1 text-xl font-semibold capitalize">{snapshot.profile.confidenceLevel}</p>
          </div>
          <div className="rounded-3xl border border-line bg-white px-4 py-3">
            <p className="text-sm text-muted">Source mode</p>
            <p className="mt-1 text-xl font-semibold capitalize">{snapshot.profile.sourceMode.replace("_", " ")}</p>
          </div>
          <div className="rounded-3xl border border-line bg-white px-4 py-3">
            <p className="text-sm text-muted">Preferred days</p>
            <p className="mt-1 text-xl font-semibold">{snapshot.profile.preferredDays.join(", ")}</p>
          </div>
          <div className="rounded-3xl border border-line bg-white px-4 py-3">
            <p className="text-sm text-muted">Reliability score</p>
            <p className="mt-1 text-xl font-semibold">{Math.round(snapshot.profile.reliabilityScore * 100)}%</p>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
