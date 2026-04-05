import { RefreshButton } from "@/components/refresh-button";
import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";
import { env } from "@/lib/grind/config/env";

export default async function AdminPage() {
  const snapshot = await loadScenario();
  const integrations = Object.entries(snapshot.integrations);
  const mode = env.demoMode ? "demo" : "live";

  return (
    <main className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <SectionCard title={mode === "demo" ? "Demo controls" : "Live sync"} eyebrow="Pipeline">
        <div className="space-y-4">
          <RefreshButton mode={mode} />
        </div>
      </SectionCard>

      <SectionCard title="Integrations" eyebrow="Status">
        <div className="space-y-3">
          {integrations.map(([name, status]) => (
            <div key={name} className="rounded-[1.8rem] border border-line bg-white px-4 py-3">
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
