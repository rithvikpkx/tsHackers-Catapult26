import type { AssignmentType, NormalizedTask, RawCalendarEvent, ScheduleEvent } from "../contracts";
import { DEMO_NOW } from "../demo/seed";

function detectAssignmentType(title: string, description: string): AssignmentType {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("essay") || text.includes("paper") || text.includes("draft")) {
    return "essay";
  }
  if (text.includes("worksheet")) {
    return "worksheet";
  }
  if (text.includes("program") || text.includes("coding") || text.includes("synchronization")) {
    return "programming_assignment";
  }
  if (text.includes("problem set") || text.includes("pset") || text.includes("homework")) {
    return "problem_set";
  }
  if (text.includes("quiz")) {
    return "quiz_prep";
  }
  return "other";
}

function inferSubject(title: string): string {
  const text = title.toLowerCase();
  if (text.includes("os") || text.includes("cs 252")) {
    return "cs252";
  }
  if (text.includes("cs 180")) {
    return "cs180";
  }
  if (text.includes("ma 261")) {
    return "ma261";
  }
  if (text.includes("history")) {
    return "hist300";
  }
  return "general";
}

function estimateBaseMinutes(assignmentType: AssignmentType, title: string): number {
  const text = title.toLowerCase();
  if (assignmentType === "essay") {
    return 360;
  }
  if (assignmentType === "programming_assignment") {
    return 220;
  }
  if (assignmentType === "worksheet") {
    return text.includes("os") ? 185 : 120;
  }
  if (assignmentType === "problem_set") {
    return 150;
  }
  return 90;
}

function detectPriority(dueDate: string, nowIso: string): "low" | "medium" | "high" {
  const diffHours = (new Date(dueDate).getTime() - new Date(nowIso).getTime()) / (1000 * 60 * 60);
  if (diffHours < 48) {
    return "high";
  }
  if (diffHours < 96) {
    return "medium";
  }
  return "low";
}

function toScheduleEvent(event: RawCalendarEvent, userId: string): ScheduleEvent {
  const lower = `${event.title} ${event.description} ${event.calendarName}`.toLowerCase();
  const isMovable = lower.includes("gym") || lower.includes("club") || lower.includes("social");
  const isClassLike =
    lower.includes("lecture") ||
    lower.includes("class") ||
    lower.includes("lab") ||
    lower.includes("recitation") ||
    lower.includes("discussion") ||
    lower.includes("uniti") ||
    lower.includes("unitime") ||
    /[a-z]{2,4}\s?\d{3}/.test(lower);
  return {
    id: `schedule-${event.id}`,
    userId,
    sourceEventId: event.id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    eventCategory: isClassLike ? "class" : "personal",
    isMovable,
    movementCostScore: isMovable ? (lower.includes("gym") ? 0.25 : 0.4) : 0.95,
    summary: isClassLike ? `Class from ${event.calendarName}` : isMovable ? "Movable if success odds materially improve." : `From ${event.calendarName}`,
  };
}

function looksActionable(event: RawCalendarEvent): boolean {
  const text = `${event.title} ${event.description} ${event.calendarName}`.toLowerCase();
  return /(due|essay|worksheet|homework|problem set|assignment|paper|quiz|exam|brightspace|submission)/.test(text);
}

export function normalizeEvents(
  rawEvents: RawCalendarEvent[],
  userId: string,
  nowIso: string = DEMO_NOW,
): {
  tasks: NormalizedTask[];
  scheduleEvents: ScheduleEvent[];
} {
  const tasks: NormalizedTask[] = [];
  const scheduleEvents: ScheduleEvent[] = [];

  for (const event of rawEvents) {
    if (!looksActionable(event)) {
      scheduleEvents.push(toScheduleEvent(event, userId));
      continue;
    }

    const assignmentType = detectAssignmentType(event.title, event.description);
    const estimatedEffortMinutesBase = estimateBaseMinutes(assignmentType, event.title);
    const recommendedStartTime = new Date(new Date(event.startsAt).getTime() - estimatedEffortMinutesBase * 60 * 1000 * 1.8)
      .toISOString();

    tasks.push({
      id: `task-${event.id}`,
      userId,
      sourceEventId: event.id,
      sourceSystem: "google_calendar",
      title: event.title.replace(/\sdue.*$/i, "").trim(),
      rawTitle: event.title,
      rawDescription: event.description,
      assignmentType,
      subject: inferSubject(event.title),
      dueDate: event.startsAt,
      recommendedStartTime,
      estimatedEffortMinutesBase,
      estimatedEffortMinutesAdjusted: estimatedEffortMinutesBase,
      predictedDelayMinutes: 0,
      predictedCompletionTimeMinutes: estimatedEffortMinutesBase,
      riskProbability: 0,
      successProbabilityBefore: 0,
      successProbabilityAfter: 0,
      confidenceScore: assignmentType === "other" ? 0.62 : 0.88,
      taskStatus: "upcoming",
      isMovable: false,
      taskPriority: detectPriority(event.startsAt, nowIso),
      confidenceLabel: assignmentType === "other" ? "medium" : "high",
      explanation: "",
      subtasks: [],
      progress: {
        totalSubtasks: 0,
        completedSubtasks: 0,
        completionRatio: 0,
        remainingMinutes: estimatedEffortMinutesBase,
        elapsedMinutes: 0,
      },
    });
  }

  return { tasks, scheduleEvents };
}
