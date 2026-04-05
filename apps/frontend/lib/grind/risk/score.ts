import { DEMO_NOW } from "../demo/seed";
import { clamp } from "../ui/format";
import type { DistortionProfileSummary, NormalizedTask, RiskAssessment, ScheduleEvent } from "../contracts";

function overlapMinutes(startA: Date, endA: Date, startB: Date, endB: Date): number {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  return Math.max(0, Math.round((end - start) / 60000));
}

function buildPreferredWindows(now: Date, dueDate: Date, startHour: number, endHour: number): Array<{ start: Date; end: Date }> {
  const windows: Array<{ start: Date; end: Date }> = [];
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  while (cursor < dueDate) {
    const start = new Date(cursor);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(cursor);
    if (endHour <= startHour) {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(endHour, 0, 0, 0);

    if (end > now) {
      windows.push({
        start: start < now ? new Date(now) : start,
        end: end > dueDate ? new Date(dueDate) : end,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return windows.filter((window) => window.end > window.start);
}

export function computeAvailableFocusMinutes(
  scheduleEvents: ScheduleEvent[],
  dueDate: string,
  profile: DistortionProfileSummary,
): number {
  const now = new Date(DEMO_NOW);
  const due = new Date(dueDate);
  const windows = buildPreferredWindows(now, due, profile.bestFocusStartHour, profile.bestFocusEndHour);

  return windows.reduce((total, window) => {
    const blocked = scheduleEvents.reduce((blockedMinutes, event) => {
      return (
        blockedMinutes +
        overlapMinutes(window.start, window.end, new Date(event.startsAt), new Date(event.endsAt))
      );
    }, 0);
    const free = Math.max(0, Math.round((window.end.getTime() - window.start.getTime()) / 60000) - blocked);
    return total + free;
  }, 0);
}

export function assessRisk(task: NormalizedTask, scheduleEvents: ScheduleEvent[], profile: DistortionProfileSummary): RiskAssessment {
  const multiplier = profile.underestimationMultipliers[task.assignmentType] ?? profile.underestimationMultipliers.other;
  const predictedRequiredMinutes = Math.round(task.progress.remainingMinutes * multiplier);
  const predictedDelayMinutes = task.progress.derivedStartTime ? 0 : Math.round(profile.meanStartDelayMinutes * (task.assignmentType === "essay" ? 0.8 : 1));
  const availableMinutesBeforeDue = computeAvailableFocusMinutes(scheduleEvents, task.dueDate, profile);

  const ambiguityScore = task.assignmentType === "essay" ? 0.16 : task.assignmentType === "programming_assignment" ? 0.12 : 0.08;
  const delayScore = clamp(predictedDelayMinutes / 2400, 0, 0.35);
  const timePressureScore = clamp((predictedRequiredMinutes - availableMinutesBeforeDue) / Math.max(predictedRequiredMinutes, 1), 0, 0.55);
  const fragmentationScore = clamp(task.subtasks.length / 14, 0.05, 0.2);
  const reliabilityRelief = profile.reliabilityScore * 0.1;

  const riskProbability = clamp(0.18 + timePressureScore + delayScore + ambiguityScore + fragmentationScore - reliabilityRelief);
  const successProbability = clamp(1 - riskProbability);

  return {
    id: `risk-${task.id}`,
    taskId: task.id,
    assessedAt: DEMO_NOW,
    riskProbability: Number(riskProbability.toFixed(2)),
    successProbability: Number(successProbability.toFixed(2)),
    riskLevel: riskProbability > 0.7 ? "high" : riskProbability > 0.4 ? "medium" : "low",
    explanation:
      task.assignmentType === "programming_assignment" || task.assignmentType === "worksheet"
        ? "High risk because you usually underestimate technical assignments and only have one high-quality work window before the deadline."
        : "Risk is elevated because this task is broad, citation-heavy, and likely to start later than planned.",
    availableMinutesBeforeDue,
    predictedRequiredMinutes,
    bottleneckType:
      timePressureScore >= delayScore && timePressureScore >= fragmentationScore ? "capacity" : delayScore >= fragmentationScore ? "delay" : "fragmentation",
    scheduleFragmentationScore: Number(fragmentationScore.toFixed(2)),
  };
}
