"use client";

import { useMemo, useState } from "react";
import { logTaskEvent, scoreTask, Task, TaskEventType } from "../lib/api";
import { toPercent, riskTone } from "../lib/task-format";

export function TaskCard({ task }: { task: Task }) {
  const [current, setCurrent] = useState<Task>(task);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const preferredWork = useMemo(() => {
    if (!current.preferred_work_times) return "n/a";
    const sorted = Object.entries(current.preferred_work_times).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    return sorted.map(([slot, score]) => `${slot}: ${Math.round((score ?? 0) * 100)}%`).join(", ");
  }, [current.preferred_work_times]);

  async function handleEvent(eventType: Extract<TaskEventType, "task_started" | "task_completed">) {
    try {
      setStatusMessage("Saving...");
      const timestamp = new Date().toISOString();
      const eventPayload = {
        event_type: eventType,
        task_id: current.id,
        occurred_at: timestamp,
        metadata: {
          start_lag_hours: eventType === "task_started" ? 2 : undefined,
          actual_duration_hours: eventType === "task_completed" ? current.corrected_effort_hours ?? 0 : undefined,
          action_origin: "frontend",
        },
      };
      await logTaskEvent(eventPayload);
      if (eventType === "task_completed") {
        setCurrent((prev) => ({ ...prev, status: "done", end_timestamp: timestamp }));
      }
      if (eventType === "task_started") {
        setCurrent((prev) => ({ ...prev, status: "in_progress", start_timestamp: timestamp }));
      }
      setStatusMessage("Saved.");
    } catch (error) {
      setStatusMessage("Unable to save event.");
    } finally {
      setTimeout(() => setStatusMessage(null), 2000);
    }
  }

  async function handleRefresh() {
    try {
      setStatusMessage("Refreshing predictions…");
      const updated = await scoreTask(current.id);
      setCurrent(updated);
      setStatusMessage("Predictions updated.");
    } catch (error) {
      setStatusMessage("Unable to refresh predictions.");
    } finally {
      setTimeout(() => setStatusMessage(null), 2000);
    }
  }

  return (
    <section className="rounded border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted">{current.course}</p>
          <h2 className="mt-1 text-2xl font-semibold">{current.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{current.risk_explanation}</p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${riskTone(current.course_risk_prior)}`}>
            Course prior {toPercent(current.course_risk_prior)}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${riskTone(current.failure_risk)}`}>
            Task risk {toPercent(current.failure_risk)}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Estimated</dt>
          <dd className="mt-1 font-medium">{current.estimated_effort_hours.toFixed(1)}h</dd>
        </div>
        <div>
          <dt className="text-muted">Corrected</dt>
          <dd className="mt-1 font-medium">{(current.corrected_effort_hours ?? 0).toFixed(1)}h</dd>
        </div>
        <div>
          <dt className="text-muted">Status</dt>
          <dd className="mt-1 font-medium capitalize">{current.status.replace("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-muted">Due</dt>
          <dd className="mt-1 font-medium">{new Date(current.due_date).toLocaleString()}</dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-muted">Predicted start delay</dt>
          <dd className="mt-1 font-medium">{(current.predicted_start_delay_hours ?? 0).toFixed(1)}h</dd>
        </div>
        <div>
          <dt className="text-muted">Predicted completion</dt>
          <dd className="mt-1 font-medium">{(current.predicted_completion_hours ?? 0).toFixed(1)}h</dd>
        </div>
        <div>
          <dt className="text-muted">Best work window</dt>
          <dd className="mt-1 font-medium">{current.best_work_window ?? "n/a"}</dd>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          className="rounded bg-accent px-4 py-2 text-white hover:bg-accent/90"
          onClick={() => handleEvent("task_started")}
        >
          Start task
        </button>
        <button
          className="rounded border border-black/10 bg-white px-4 py-2 hover:border-accent"
          onClick={() => handleEvent("task_completed")}
        >
          Complete task
        </button>
        <button
          className="rounded border border-black/10 bg-white px-4 py-2 hover:border-accent"
          onClick={handleRefresh}
        >
          Refresh ML predictions
        </button>
      </div>
      <p className="mt-4 text-sm text-muted">Preferred work times: {preferredWork}</p>
      {statusMessage ? <p className="mt-3 text-sm text-muted">{statusMessage}</p> : null}
    </section>
  );
}
