import { SectionCard } from "@/components/section-card";
import { StatTile } from "@/components/stat-tile";
import { loadScenario } from "@/app/lib/api";

export default async function ProfilePage() {
  const snapshot = await loadScenario();

  return (
    <main className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <SectionCard title="Distortion profile" eyebrow="Model">
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          <StatTile label="Programming multiplier" value={`${snapshot.profile.underestimationMultipliers.programming_assignment.toFixed(1)}x`} />
          <StatTile label="Start delay" value={`${(snapshot.profile.meanStartDelayMinutes / 60 / 24).toFixed(1)}d`} />
          <StatTile label="Focus window" value="9 PM - 1 AM" />
        </div>
      </SectionCard>

      <SectionCard title="Signals" eyebrow={snapshot.profile.sourceMode.replace("_", " ")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile label="Confidence" value={snapshot.profile.confidenceLevel} />
          <StatTile label="Reliability" value={`${Math.round(snapshot.profile.reliabilityScore * 100)}%`} />
          <StatTile label="Preferred days" value={snapshot.profile.preferredDays.join(", ")} />
          <StatTile label="Availability match" value={`${Math.round((1 - snapshot.profile.availabilityMismatchScore) * 100)}%`} />
        </div>
      </SectionCard>
    </main>
  );
}
