import { FocusSession } from "@/components/focus-session";
import { loadScenario } from "@/app/lib/api";

type FocusPageProps = {
  searchParams?: Promise<{
    taskId?: string;
  }>;
};

export default async function FocusPage({ searchParams }: FocusPageProps) {
  const snapshot = await loadScenario();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const taskId = resolvedSearchParams?.taskId;
  const task = snapshot.tasks.find((entry) => entry.id === taskId) ?? snapshot.highestRiskTask ?? snapshot.tasks[0];

  return (
    <main>{task ? <FocusSession task={task} /> : <div className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">No focus step is available.</div>}</main>
  );
}
