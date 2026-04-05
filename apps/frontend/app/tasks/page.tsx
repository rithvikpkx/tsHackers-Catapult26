import Link from "next/link";
import { loadScenario } from "@/app/lib/api";
import { DeleteTaskButton } from "@/components/delete-task-button";
import { LiveTime } from "@/components/live-time";
import { formatMinutes, formatPercent } from "@/lib/grind/ui/format";

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M2.75 12s3.4-5.75 9.25-5.75S21.25 12 21.25 12 17.85 17.75 12 17.75 2.75 12 2.75 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

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
                <p className="mt-2 text-sm text-muted">{task.assignmentType.replaceAll("_", " ")} / {task.subject.toUpperCase()}</p>
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
                  <div className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                    <LiveTime value={task.dueDate} />
                  </div>
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
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#171717,#1f4b99)] px-4 py-2 text-sm text-white shadow-[0_10px_24px_rgba(23,23,23,0.14)] transition hover:brightness-[1.04]"
                  href={`/focus?taskId=${task.id}`}
                >
                  <PlayIcon />
                  Start focus session
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-accent/18 bg-[linear-gradient(180deg,rgba(31,75,153,0.07),rgba(255,255,255,0.94))] px-4 py-2 text-sm text-accent transition hover:border-accent/30 hover:bg-[linear-gradient(180deg,rgba(31,75,153,0.1),rgba(255,255,255,0.98))]"
                  href={`/tasks/${task.id}`}
                >
                  <EyeIcon />
                  View task
                </Link>
                <DeleteTaskButton taskId={task.id} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
