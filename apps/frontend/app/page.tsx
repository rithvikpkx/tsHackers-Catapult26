import { loadDemoTasks, toPercent } from "./lib/demo-data";

const routes = [
  { href: "/tasks", label: "Tasks" },
  { href: "/why-stuck", label: "Why Am I Stuck?" },
  { href: "/urgent-update", label: "Urgent Update" },
  { href: "/updated-schedule", label: "Updated Schedule" },
  { href: "/start-mode", label: "Start Mode" }
];

export default async function HomePage() {
  const tasks = await loadDemoTasks();
  const highestRisk = [...tasks].sort((left, right) => (right.failure_risk ?? 0) - (left.failure_risk ?? 0))[0];
  const averagePrior =
    tasks.reduce((total, task) => total + (task.course_risk_prior ?? 0), 0) / Math.max(tasks.length, 1);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight">Grind Pulse Board</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Seeded with the OULAD bootstrap prior plus the task-risk combiner so Builder B can design against real ML-shaped fields.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <section className="rounded border border-black/10 bg-white p-4">
          <p className="text-sm text-muted">Average course prior</p>
          <p className="mt-2 text-3xl font-semibold">{toPercent(averagePrior)}</p>
        </section>
        <section className="rounded border border-black/10 bg-white p-4">
          <p className="text-sm text-muted">Highest task risk</p>
          <p className="mt-2 text-3xl font-semibold">{toPercent(highestRisk?.failure_risk)}</p>
        </section>
        <section className="rounded border border-black/10 bg-white p-4">
          <p className="text-sm text-muted">Current hot task</p>
          <p className="mt-2 text-lg font-semibold">{highestRisk?.title ?? "No demo task loaded"}</p>
        </section>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {routes.map((route) => (
          <a
            className="rounded border border-black/10 bg-white p-4 hover:border-accent"
            href={route.href}
            key={route.href}
          >
            {route.label}
          </a>
        ))}
      </div>
    </main>
  );
}

