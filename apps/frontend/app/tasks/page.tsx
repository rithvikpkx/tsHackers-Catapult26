import { loadDemoTasks } from "../lib/demo-data";
import { loadTasks, Task } from "../lib/api";
import { TaskCard } from "./task-card";

export default async function TasksPage() {
  const backendTasks = await loadTasks();
  const demoTasks = backendTasks.length ? backendTasks : await loadDemoTasks();
  const orderedTasks = [...demoTasks].sort((left, right) => (right.failure_risk ?? 0) - (left.failure_risk ?? 0));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Tasks</h1>
      <p className="mt-3 text-muted">Ranked task list with corrected effort, bootstrap course prior, and final task failure risk.</p>
      <div className="mt-8 space-y-4">
        {orderedTasks.map((task) => (
          <TaskCard key={task.id} task={task as Task} />
        ))}
      </div>
    </main>
  );
}
