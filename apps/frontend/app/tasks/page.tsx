import Link from "next/link";
import { loadScenario } from "@/app/lib/api";
import { formatMinutes, formatPercent, formatShortDate } from "@/lib/grind/ui/format";

export default async function TasksPage() {
  const snapshot = await loadScenario();

  return (
    <main className="space-y-5">
      <section className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Tasks</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">Queue</h1>
      </section>

      <div className="space-y-4">
        {snapshot.tasks.length === 0 ? (
          <article className="rounded-card border border-dashed border-line bg-surface/90 px-5 py-10 text-center shadow-soft">
            <p className="text-lg font-semibold tracking-[-0.03em]">No tasks yet</p>
            <p className="mt-2 text-sm text-muted">Sync your calendar from Admin to import deadlines or generate starter tasks.</p>
          </article>
        ) : null}
        {snapshot.tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-card border border-line bg-surface/95 px-5 py-5 shadow-soft transition hover:border-accent/20"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      task.riskProbability > 0.7 ? "bg-risk" : task.riskProbability > 0.45 ? "bg-accent" : "bg-safe"
                    }`}
                  />
                  <h2 className="truncate text-2xl font-semibold tracking-[-0.04em]">{task.title}</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {task.assignmentType.replaceAll("_", " ")} · {task.subject.toUpperCase()}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[38rem] xl:grid-cols-4">
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(31,75,153,0.06),rgba(255,255,255,0.8))] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Risk</p>
                  <p className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${task.riskProbability > 0.7 ? "text-risk" : "text-ink"}`}>
                    {formatPercent(task.riskProbability)}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(31,75,153,0.06),rgba(255,255,255,0.8))] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Remaining</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{formatMinutes(task.progress.remainingMinutes)}</p>
                </div>
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(31,75,153,0.06),rgba(255,255,255,0.8))] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Due</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">{formatShortDate(task.dueDate)}</p>
                </div>
                <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(44,122,75,0.07),rgba(255,255,255,0.8))] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Progress</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
                    {task.progress.completedSubtasks}/{task.progress.totalSubtasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap gap-2">
                {task.subtasks.slice(0, 3).map((subtask) => (
                  <span key={subtask.id} className="rounded-full border border-line bg-white px-3 py-2 text-sm text-muted">
                    {subtask.sequence + 1}. {subtask.title}
                  </span>
                ))}
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black"
                  href={`/focus?taskId=${task.id}`}
                >
                  Start focus session
                </Link>
                <Link
                  className="rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink"
                  href={`/tasks/${task.id}`}
                >
                  View task
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
