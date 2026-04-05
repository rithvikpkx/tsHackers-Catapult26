import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";
import { formatMinutes, formatPercent, formatShortDate } from "@/lib/grind/ui/format";

export default async function TasksPage() {
  const snapshot = await loadScenario();

  return (
    <main className="space-y-5">
      <section className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Tasks</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">Concrete work, not vague assignments.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Every imported assignment is broken into specific next actions. Progress starts when the first subtask starts and ends at submission.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {snapshot.tasks.map((task) => (
          <SectionCard key={task.id} title={task.title} eyebrow={`${task.assignmentType.replaceAll("_", " ")} · ${task.subject.toUpperCase()}`}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-canvas px-4 py-3">
                  <p className="text-sm text-muted">Risk</p>
                  <p className={`mt-1 text-xl font-semibold ${task.riskProbability > 0.7 ? "text-risk" : "text-ink"}`}>{formatPercent(task.riskProbability)}</p>
                </div>
                <div className="rounded-3xl bg-canvas px-4 py-3">
                  <p className="text-sm text-muted">Remaining</p>
                  <p className="mt-1 text-xl font-semibold">{formatMinutes(task.progress.remainingMinutes)}</p>
                </div>
                <div className="rounded-3xl bg-canvas px-4 py-3">
                  <p className="text-sm text-muted">Due</p>
                  <p className="mt-1 text-base font-semibold">{formatShortDate(task.dueDate)}</p>
                </div>
              </div>
              <p className="text-sm text-muted">
                {task.progress.completedSubtasks}/{task.progress.totalSubtasks} steps complete.
              </p>
              <div className="space-y-2">
                {task.subtasks.slice(0, 3).map((subtask) => (
                  <div key={subtask.id} className="rounded-3xl border border-line bg-white px-4 py-3 text-sm text-muted">
                    <span className="font-semibold text-ink">{subtask.sequence + 1}. </span>
                    {subtask.title}
                  </div>
                ))}
              </div>
              <Link className="inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink" href={`/tasks/${task.id}`}>
                Open full breakdown
              </Link>
            </div>
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
