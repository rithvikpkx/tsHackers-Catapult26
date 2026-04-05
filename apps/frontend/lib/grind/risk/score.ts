import { DEMO_NOW } from "../demo/seed";
import { clamp, formatMinutes } from "../ui/format";
import type { DistortionProfileSummary, NormalizedTask, RiskAssessment, ScheduleEvent } from "../contracts";

function overlapMinutes(startA: Date, endA: Date, startB: Date, endB: Date): number {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  return Math.max(0, Math.round((end - start) / 60000));
}

function diffMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
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

function assignmentAmbiguityScore(task: NormalizedTask): number {
  switch (task.assignmentType) {
    case "essay":
    case "discussion_post":
      return 0.12;
    case "programming_assignment":
    case "project":
      return 0.1;
    case "exam_prep":
    case "quiz_prep":
      return 0.08;
    default:
      return 0.05;
  }
}

function assignmentComplexityScore(task: NormalizedTask): number {
  const estimateSignal = clamp(task.estimatedEffortMinutesBase / 420, 0, 1) * 0.12;
  const descriptionSignal = clamp(task.rawDescription.length / 800, 0, 1) * 0.06;
  return estimateSignal + descriptionSignal;
}

function buildResolvedRisk(task: NormalizedTask, nowIso: string): RiskAssessment {
  return {
    id: `risk-${task.id}`,
    taskId: task.id,
    assessedAt: nowIso,
    riskProbability: 0,
    successProbability: 1,
    riskLevel: "low",
    explanation: "This task is complete. No deadline risk remains.",
    availableMinutesBeforeDue: 0,
    predictedRequiredMinutes: 0,
    bottleneckType: "capacity",
    scheduleFragmentationScore: 0,
  };
}

function buildOverdueRisk(task: NormalizedTask, nowIso: string, predictedRequiredMinutes: number): RiskAssessment {
  return {
    id: `risk-${task.id}`,
    taskId: task.id,
    assessedAt: nowIso,
    riskProbability: 1,
    successProbability: 0,
    riskLevel: "high",
    explanation: `The due time has already passed and Grind still estimates about ${formatMinutes(predictedRequiredMinutes)} of work remaining.`,
    availableMinutesBeforeDue: 0,
    predictedRequiredMinutes,
    bottleneckType: "capacity",
    scheduleFragmentationScore: 0,
  };
}

export function computeAvailableFocusMinutes(
  scheduleEvents: ScheduleEvent[],
  dueDate: string,
  profile: DistortionProfileSummary,
  nowIso: string = DEMO_NOW,
): number {
  const now = new Date(nowIso);
  const due = new Date(dueDate);
  const windows = buildPreferredWindows(now, due, profile.bestFocusStartHour, profile.bestFocusEndHour);

  return windows.reduce((total, window) => {
    const blocked = scheduleEvents.reduce((blockedMinutes, event) => {
      return blockedMinutes + overlapMinutes(window.start, window.end, new Date(event.startsAt), new Date(event.endsAt));
    }, 0);
    const free = Math.max(0, Math.round((window.end.getTime() - window.start.getTime()) / 60000) - blocked);
    return total + free;
  }, 0);
}

export function assessRisk(
  task: NormalizedTask,
  scheduleEvents: ScheduleEvent[],
  profile: DistortionProfileSummary,
  nowIso: string = DEMO_NOW,
): RiskAssessment {
  const now = new Date(nowIso);
  const due = new Date(task.dueDate);
  const multiplier = profile.underestimationMultipliers[task.assignmentType] ?? profile.underestimationMultipliers.other;
  const predictedRequiredMinutes = Math.max(0, Math.round(task.progress.remainingMinutes * multiplier));

  if (
    task.taskStatus === "submitted" ||
    task.taskStatus === "completed" ||
    task.progress.totalSubtasks > 0 && task.progress.completedSubtasks === task.progress.totalSubtasks ||
    task.progress.remainingMinutes <= 0
  ) {
    return buildResolvedRisk(task, nowIso);
  }

  if (due <= now) {
    return buildOverdueRisk(task, nowIso, Math.max(predictedRequiredMinutes, 15));
  }

  const availableMinutesBeforeDue = computeAvailableFocusMinutes(scheduleEvents, task.dueDate, profile, nowIso);
  const minutesUntilDue = diffMinutes(now, due);
  const predictedDelayMinutes = task.progress.derivedStartTime ? 0 : Math.round(profile.meanStartDelayMinutes * (task.assignmentType === "essay" ? 0.8 : 1));
  const slackMinutes = availableMinutesBeforeDue - predictedRequiredMinutes;
  const completionRatio = clamp(task.progress.completionRatio);
  const fragmentationRatio = clamp((task.subtasks.length - 1) / 8, 0, 1);

  const capacityScore =
    clamp((predictedRequiredMinutes - availableMinutesBeforeDue) / Math.max(predictedRequiredMinutes, 60), 0, 1) * 0.38;
  const urgencyScore = clamp(1 - minutesUntilDue / (72 * 60), 0, 1) * 0.2;
  const delayScore = clamp(predictedDelayMinutes / Math.max(minutesUntilDue, 90), 0, 1) * 0.22;
  const workloadScore = clamp(predictedRequiredMinutes / Math.max(minutesUntilDue, 120), 0, 1) * 0.18;
  const fragmentationScore = fragmentationRatio * 0.14;
  const ambiguityScore = assignmentAmbiguityScore(task);
  const complexityScore = assignmentComplexityScore(task);

  const progressRelief = completionRatio * 0.24;
  const slackRelief = clamp(slackMinutes / Math.max(predictedRequiredMinutes, 60), 0, 1) * 0.18;
  const reliabilityRelief = profile.reliabilityScore * 0.1;

  const riskProbability = clamp(
    0.04 +
      capacityScore +
      urgencyScore +
      delayScore +
      workloadScore +
      fragmentationScore +
      ambiguityScore +
      complexityScore -
      progressRelief -
      slackRelief -
      reliabilityRelief,
  );
  const successProbability = clamp(1 - riskProbability);

  const capacitySignal = capacityScore + urgencyScore + workloadScore;
  const bottleneckType =
    capacitySignal >= delayScore && capacitySignal >= fragmentationScore && capacitySignal >= ambiguityScore
      ? "capacity"
      : delayScore >= fragmentationScore && delayScore >= ambiguityScore
        ? "delay"
        : fragmentationScore >= ambiguityScore
          ? "fragmentation"
          : "ambiguity";

  const explanation =
    bottleneckType === "capacity"
      ? `Only ${formatMinutes(availableMinutesBeforeDue)} of likely focus time remain before this deadline, while the remaining work looks closer to ${formatMinutes(predictedRequiredMinutes)}.`
      : bottleneckType === "delay"
        ? `Your usual start delay of about ${formatMinutes(predictedDelayMinutes)} still takes a meaningful chunk out of the remaining ${formatMinutes(minutesUntilDue)} window.`
        : bottleneckType === "fragmentation"
          ? `This task is split across ${task.subtasks.length} steps, so switching overhead is raising the risk even though the raw estimate looks manageable.`
          : `${task.assignmentType.replaceAll("_", " ")} work often expands after you begin, so the current estimate is still carrying more uncertainty than usual.`;

  return {
    id: `risk-${task.id}`,
    taskId: task.id,
    assessedAt: nowIso,
    riskProbability: Number(riskProbability.toFixed(2)),
    successProbability: Number(successProbability.toFixed(2)),
    riskLevel: riskProbability > 0.7 ? "high" : riskProbability > 0.4 ? "medium" : "low",
    explanation,
    availableMinutesBeforeDue,
    predictedRequiredMinutes,
    bottleneckType,
    scheduleFragmentationScore: Number(fragmentationRatio.toFixed(2)),
  };
}
