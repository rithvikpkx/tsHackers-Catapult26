import path from "node:path";
import { readFile } from "node:fs/promises";

export type DemoTask = {
  id: string;
  title: string;
  course: string;
  due_date: string;
  estimated_effort_hours: number;
  corrected_effort_hours?: number;
  course_risk_prior?: number;
  failure_risk?: number;
  risk_explanation?: string;
  status: "todo" | "in_progress" | "blocked" | "done";
};

const seedTasksPath = path.join(process.cwd(), "..", "..", "data", "seed", "tasks.json");

export async function loadDemoTasks(): Promise<DemoTask[]> {
  const raw = await readFile(seedTasksPath, "utf8");
  return JSON.parse(raw) as DemoTask[];
}

export function toPercent(value: number | undefined): string {
  return value === undefined ? "n/a" : `${Math.round(value * 100)}%`;
}

export function riskTone(value: number | undefined): string {
  if (value === undefined) return "bg-stone-200 text-stone-700";
  if (value >= 0.7) return "bg-red-100 text-red-800";
  if (value >= 0.4) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}
