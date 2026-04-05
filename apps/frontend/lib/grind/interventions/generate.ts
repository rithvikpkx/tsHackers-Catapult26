import { DEMO_NOW } from "../demo/seed";
import { clamp } from "../ui/format";
import type { DistortionProfileSummary, InterventionProposal, NormalizedTask, RiskAssessment, ScheduleEvent } from "../contracts";
import { computeAvailableFocusMinutes } from "../risk/score";

function plusMinutes(timestamp: string, minutes: number): string {
  return new Date(new Date(timestamp).getTime() + minutes * 60000).toISOString();
}

export function generateIntervention(
  task: NormalizedTask | undefined,
  risk: RiskAssessment | undefined,
  scheduleEvents: ScheduleEvent[],
  profile: DistortionProfileSummary,
  nowIso: string = DEMO_NOW,
): InterventionProposal | undefined {
  if (!task || !risk || risk.riskLevel !== "high") {
    return undefined;
  }

  const movable = scheduleEvents
    .filter((event) => event.isMovable && new Date(event.endsAt) < new Date(task.dueDate))
    .sort((left, right) => left.movementCostScore - right.movementCostScore)[0];

  if (!movable) {
    return undefined;
  }

  const now = new Date(nowIso);
  const due = new Date(task.dueDate);
  const focusStartDate = new Date(now);
  focusStartDate.setHours(profile.bestFocusStartHour, 0, 0, 0);
  if (focusStartDate <= now) {
    focusStartDate.setDate(focusStartDate.getDate() + 1);
  }

  const extraMinutes = 240;
  const latestPossibleStart = new Date(due.getTime() - extraMinutes * 60000);
  if (focusStartDate > latestPossibleStart) {
    focusStartDate.setTime(latestPossibleStart.getTime());
  }
  if (focusStartDate < now) {
    focusStartDate.setTime(now.getTime());
  }

  const focusStart = focusStartDate.toISOString();
  const focusEnd = plusMinutes(focusStart, 240);
  const improvedAvailableMinutes = computeAvailableFocusMinutes(scheduleEvents, task.dueDate, profile, nowIso) + extraMinutes;
  const improvedRisk = clamp(
    risk.riskProbability - Math.min(0.56, extraMinutes / Math.max(risk.predictedRequiredMinutes, 1) * 0.58),
  );
  const improvedSuccess = clamp(1 - improvedRisk);

  return {
    id: `intervention-${task.id}`,
    taskId: task.id,
    createdAt: DEMO_NOW,
    interventionType: "combined",
    summaryText: `Grind moved ${movable.title.toLowerCase()} and reserved a 4-hour focus block for ${task.title}.`,
    rationaleText: `You need about ${Math.round(risk.predictedRequiredMinutes / 60)} hours of uninterrupted time, but your calendar only showed ${Math.round(risk.availableMinutesBeforeDue / 60)} usable hours before the deadline. This intervention recovers ${Math.round((improvedAvailableMinutes - risk.availableMinutesBeforeDue) / 60)} more hours in your best focus window.`,
    successProbabilityBefore: risk.successProbability,
    successProbabilityAfter: Number(improvedSuccess.toFixed(2)),
    riskProbabilityBefore: risk.riskProbability,
    riskProbabilityAfter: Number(improvedRisk.toFixed(2)),
    calendarChanges: [
      {
        id: `${movable.id}-move`,
        title: movable.title,
        startsAt: movable.startsAt,
        endsAt: movable.endsAt,
        changeType: "move",
        detail: `Move ${movable.title.toLowerCase()} later so a clean work block opens before the deadline.`,
      },
      {
        id: `focus-${task.id}`,
        title: `${task.subject.toUpperCase()} focus block`,
        startsAt: focusStart,
        endsAt: focusEnd,
        changeType: "focus_block",
        detail: "Create a mirrored Grind block in the evening focus window.",
      },
    ],
    status: "proposed",
  };
}
