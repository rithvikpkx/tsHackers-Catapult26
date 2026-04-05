import type { NormalizedTask, Subtask, TaskProgressSummary, TaskStatus } from "../contracts";

function diffMinutes(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function sumEstimatedMinutes(subtasks: Subtask[]): number {
  return subtasks.reduce((total, subtask) => total + subtask.estimatedMinutes, 0);
}

export function buildProgress(subtasks: Subtask[]): TaskProgressSummary {
  const completedSubtasks = subtasks.filter((subtask) => subtask.status === "completed");
  const firstStarted = [...subtasks]
    .filter((subtask) => subtask.startedAt)
    .sort((left, right) => new Date(left.startedAt ?? 0).getTime() - new Date(right.startedAt ?? 0).getTime())[0];
  const lastCompleted = [...completedSubtasks]
    .filter((subtask) => subtask.completedAt)
    .sort((left, right) => new Date(right.completedAt ?? 0).getTime() - new Date(left.completedAt ?? 0).getTime())[0];

  const elapsedMinutes =
    firstStarted?.startedAt && lastCompleted?.completedAt ? diffMinutes(firstStarted.startedAt, lastCompleted.completedAt) : 0;
  const totalEstimatedMinutes = sumEstimatedMinutes(subtasks);
  const completedEstimatedMinutes = completedSubtasks.reduce((total, subtask) => total + subtask.estimatedMinutes, 0);

  return {
    totalSubtasks: subtasks.length,
    completedSubtasks: completedSubtasks.length,
    completionRatio: subtasks.length ? completedSubtasks.length / subtasks.length : 0,
    derivedStartTime: firstStarted?.startedAt,
    derivedCompletionTime: lastCompleted?.completedAt,
    remainingMinutes: Math.max(0, totalEstimatedMinutes - completedEstimatedMinutes),
    elapsedMinutes,
  };
}

export function deriveTaskStatus(task: NormalizedTask): TaskStatus {
  if (task.progress.completedSubtasks === task.progress.totalSubtasks && task.progress.totalSubtasks > 0) {
    return "submitted";
  }
  if (task.progress.completedSubtasks > 0 || task.progress.derivedStartTime) {
    return "in_progress";
  }
  if (new Date(task.dueDate).getTime() < Date.now()) {
    return "overdue";
  }
  return "upcoming";
}
