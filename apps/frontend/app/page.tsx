const routes = [
  { href: "/tasks", label: "Tasks" },
  { href: "/why-stuck", label: "Why Am I Stuck?" },
  { href: "/urgent-update", label: "Urgent Update" },
  { href: "/updated-schedule", label: "Updated Schedule" },
  { href: "/start-mode", label: "Start Mode" }
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight">Grind Pulse Board</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Shell page for Builder B. Replace seeded values with real backend + ML outputs.
      </p>
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

