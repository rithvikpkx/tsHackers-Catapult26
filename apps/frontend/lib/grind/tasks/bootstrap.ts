import type { NormalizedTask, ScheduleEvent } from "../contracts";

function isoPlusHours(base: string, hours: number): string {
  return new Date(new Date(base).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function buildStarterTask(
  userId: string,
  id: string,
  title: string,
  subject: string,
  dueDate: string,
  recommendedStartTime: string,
  estimatedEffortMinutesBase: number,
  explanation: string,
): NormalizedTask {
  return {
    id,
    userId,
    sourceEventId: id,
    sourceSystem: "google_calendar",
    title,
    rawTitle: title,
    rawDescription: explanation,
    assignmentType: "other",
    subject,
    dueDate,
    recommendedStartTime,
    estimatedEffortMinutesBase,
    estimatedEffortMinutesAdjusted: estimatedEffortMinutesBase,
    predictedDelayMinutes: 0,
    predictedCompletionTimeMinutes: estimatedEffortMinutesBase,
    riskProbability: 0,
    successProbabilityBefore: 0,
    successProbabilityAfter: 0,
    confidenceScore: 0.42,
    taskStatus: "upcoming",
    isMovable: false,
    taskPriority: "low",
    confidenceLabel: "medium",
    explanation,
    subtasks: [],
    progress: {
      totalSubtasks: 0,
      completedSubtasks: 0,
      completionRatio: 0,
      remainingMinutes: estimatedEffortMinutesBase,
      elapsedMinutes: 0,
    },
  };
}

export function buildStarterTasks(userId: string, nowIso: string, scheduleEvents: ScheduleEvent[]): NormalizedTask[] {
  const nextAcademicEvent = [...scheduleEvents].find((event) => event.eventCategory === "class" || event.eventCategory === "meeting");
  const subject = nextAcademicEvent?.title.includes("CS") ? "cs252" : nextAcademicEvent?.title.includes("History") ? "hist300" : "general";

  return [
    buildStarterTask(
      userId,
      "starter-week-map",
      "Map the next academic deadlines",
      subject,
      isoPlusHours(nowIso, 36),
      nowIso,
      20,
      "A short planning pass gives Grind an initial signal about how quickly you begin low-friction work.",
    ),
    buildStarterTask(
      userId,
      "starter-open-next",
      "Open the next assignment and define done",
      subject,
      isoPlusHours(nowIso, 48),
      isoPlusHours(nowIso, 12),
      25,
      "This is a low-risk calibration task. Finishing it helps Grind learn how you transition from awareness into real work.",
    ),
    buildStarterTask(
      userId,
      "starter-focus-block",
      "Complete one 25-minute calibration block",
      subject,
      isoPlusHours(nowIso, 60),
      isoPlusHours(nowIso, 18),
      25,
      "A short focus block gives Grind its first timing data before the system has enough history to score risk confidently.",
    ),
  ];
}
