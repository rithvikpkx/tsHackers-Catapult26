import { RefreshButton } from "@/components/refresh-button";
import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";

export default async function AdminPage() {
  const snapshot = await loadScenario();
  const integrations = Object.entries(snapshot.integrations);

  return (
    <main className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <SectionCard title="Demo control surface" eyebrow="Pipeline operations">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            This seeded scenario uses the same normalization, subtask generation, risk scoring, intervention, email, and voice composition pipeline every time you rerun it.
          </p>
          <RefreshButton />
        </div>
      </SectionCard>

      <SectionCard title="Live integration readiness" eyebrow="Credentials and providers">
        <div className="space-y-3">
          {integrations.map(([name, status]) => (
            <div key={name} className="rounded-3xl border border-line bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold capitalize">{name.replace(/([A-Z])/g, " $1")}</p>
                <span className="text-sm text-muted">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
