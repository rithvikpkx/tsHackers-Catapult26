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
