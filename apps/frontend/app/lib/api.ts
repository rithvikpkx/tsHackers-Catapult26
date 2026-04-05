export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type Task = {
  id: string;
  title: string;
  course: string;
  task_type: string;
  due_date: string;
  estimated_effort_hours: number;
  corrected_effort_hours?: number;
  course_risk_prior?: number;
  failure_risk?: number;
  risk_explanation?: string;
  status: TaskStatus;
  start_timestamp?: string;
  end_timestamp?: string;
  actual_duration_hours?: number;
  predicted_start_delay_hours?: number;
  predicted_completion_hours?: number;
  best_work_window?: string;
  preferred_work_times?: Record<string, number>;
};

export type TaskEventType =
  | "task_created"
  | "estimate_updated"
  | "task_started"
  | "focus_block_accepted"
  | "focus_block_completed"
  | "task_completed"
  | "task_overdue";

export type TaskEvent = {
  event_type: TaskEventType;
  task_id: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function loadTasks(): Promise<Task[]> {
  try {
    return await fetchJson<Task[]>(`${BACKEND_URL}/api/tasks`);
  } catch (error) {
    console.warn("Unable to load backend tasks, falling back to demo data.", error);
    return [];
  }
}

export async function logTaskEvent(event: TaskEvent): Promise<void> {
  await fetchJson(`${BACKEND_URL}/api/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function scoreTask(taskId: string): Promise<Task> {
  return await fetchJson<Task>(`${BACKEND_URL}/api/tasks/${taskId}/score`, {
    method: "POST",
  });
}

export async function createCalendarBlocks(blocks: unknown[]): Promise<{ ingested_blocks: number }> {
  return await fetchJson(`${BACKEND_URL}/api/calendar/blocks`, {
    method: "POST",
    body: JSON.stringify({ blocks }),
  });
}
