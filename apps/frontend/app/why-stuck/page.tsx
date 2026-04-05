import { loadDemoTasks } from "../lib/demo-data";
import { toPercent } from "../lib/task-format";

export default async function WhyStuckPage() {
  const tasks = await loadDemoTasks();
  const task = [...tasks].sort((left, right) => (right.failure_risk ?? 0) - (left.failure_risk ?? 0))[0];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Why Am I Stuck?</h1>
      <p className="mt-3 text-muted">User-facing explanation for the highest-risk seeded task.</p>
      {task ? (
        <section className="mt-8 rounded border border-black/10 bg-white p-6">
          <p className="text-sm uppercase tracking-wide text-muted">{task.course}</p>
          <h2 className="mt-2 text-2xl font-semibold">{task.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-black/10 bg-stone-50 p-4">
              <p className="text-sm text-muted">Course bootstrap prior</p>
              <p className="mt-2 text-3xl font-semibold">{toPercent(task.course_risk_prior)}</p>
            </div>
            <div className="rounded border border-black/10 bg-stone-50 p-4">
              <p className="text-sm text-muted">Final task failure risk</p>
              <p className="mt-2 text-3xl font-semibold">{toPercent(task.failure_risk)}</p>
            </div>
          </div>
          <p className="mt-5 text-base leading-7">{task.risk_explanation}</p>
        </section>
      ) : null}
    </main>
  );
}
