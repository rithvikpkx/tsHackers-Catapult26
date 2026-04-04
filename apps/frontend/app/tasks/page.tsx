import { loadDemoTasks, riskTone, toPercent } from "../lib/demo-data";

export default async function TasksPage() {
  const tasks = await loadDemoTasks();
  const orderedTasks = [...tasks].sort((left, right) => (right.failure_risk ?? 0) - (left.failure_risk ?? 0));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Tasks</h1>
      <p className="mt-3 text-muted">Ranked task list with corrected effort, bootstrap course prior, and final task failure risk.</p>
      <div className="mt-8 space-y-4">
        {orderedTasks.map((task) => (
          <section className="rounded border border-black/10 bg-white p-5" key={task.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted">{task.course}</p>
                <h2 className="mt-1 text-2xl font-semibold">{task.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">{task.risk_explanation}</p>
              </div>
              <div className="flex gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${riskTone(task.course_risk_prior)}`}>
                  Course prior {toPercent(task.course_risk_prior)}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${riskTone(task.failure_risk)}`}>
                  Task risk {toPercent(task.failure_risk)}
                </span>
              </div>
            </div>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">Estimated</dt>
                <dd className="mt-1 font-medium">{task.estimated_effort_hours.toFixed(1)}h</dd>
              </div>
              <div>
                <dt className="text-muted">Corrected</dt>
                <dd className="mt-1 font-medium">{task.corrected_effort_hours?.toFixed(1)}h</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-1 font-medium capitalize">{task.status.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-muted">Due</dt>
                <dd className="mt-1 font-medium">{new Date(task.due_date).toLocaleString()}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </main>
  );
}

