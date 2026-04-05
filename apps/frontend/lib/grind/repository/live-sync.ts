import "server-only";

import { auth } from "@/auth";
import type { NotificationPayload, NormalizedTask, RawCalendarEvent, ScheduleEvent, Subtask, TaskObservation } from "@/lib/grind/contracts";
import { buildNotifications } from "@/lib/grind/notifications/build";
import { buildDistortionProfile } from "@/lib/grind/profile/model";
import { assessRisk } from "@/lib/grind/risk/score";
import { getSupabaseAdminClient } from "@/lib/grind/supabase/admin";
import { generateSubtasks } from "@/lib/grind/tasks/decompose";
import { normalizeEvents } from "@/lib/grind/tasks/normalize";
import { generateRefinedSubtasksBatched } from "@/lib/grind/tasks/gemini";
import { buildProgress, deriveTaskStatus } from "@/lib/grind/tasks/progress";
import { generateIntervention } from "@/lib/grind/interventions/generate";
import { env } from "@/lib/grind/config/env";
import { LiveStoreError } from "@/lib/grind/repository/live-store";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  recurringEventId?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
};

type ConnectionRow = {
  id: string;
  user_id: string;
  encrypted_refresh_token: string | null;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  timezone: string | null;
};

type ExistingTaskRow = {
  id: string;
  source_event_id: string | null;
  actual_start_time: string | null;
  submission_time: string | null;
  task_status: string;
};

type ExistingSubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  instructions: string | null;
  sequence_index: number;
  estimated_minutes: number;
  status: Subtask["status"];
  started_at: string | null;
  completed_at: string | null;
  is_submission_step: boolean;
  source_mode: Subtask["sourceMode"];
};

type ObservationRow = {
  id: string;
  task_id: string;
  expected_start_time: string | null;
  actual_start_time: string | null;
  expected_effort_minutes: number | null;
  actual_effort_minutes: number | null;
  due_date: string;
  submission_time: string | null;
  derived_start_delay_minutes: number | null;
  derived_submission_offset_minutes: number | null;
  observed_at: string;
};

type PersistedTaskState = {
  existingSubtasks: Subtask[];
  task: NormalizedTask;
  taskId: string;
  shouldGenerateRefinedSubtasks: boolean;
};

function mapExistingSubtask(row: ExistingSubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    instructions: row.instructions ?? "",
    sequence: row.sequence_index,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    isSubmissionStep: row.is_submission_step,
    sourceMode: row.source_mode,
  };
}

function mapObservation(row: ObservationRow, userId: string, assignmentType: NormalizedTask["assignmentType"]): TaskObservation {
  return {
    id: row.id,
    userId,
    taskId: row.task_id,
    assignmentType,
    expectedStartTime: row.expected_start_time ?? row.due_date,
    actualStartTime: row.actual_start_time ?? row.due_date,
    expectedEffortMinutes: row.expected_effort_minutes ?? 60,
    actualEffortMinutes: row.actual_effort_minutes ?? row.expected_effort_minutes ?? 60,
    dueDate: row.due_date,
    submissionTime: row.submission_time ?? row.due_date,
    derivedStartDelayMinutes: row.derived_start_delay_minutes ?? 0,
    derivedSubmissionOffsetMinutes: row.derived_submission_offset_minutes ?? 0,
    observedAt: row.observed_at,
  };
}

function allDayDueDate(date: string): string {
  return `${date}T23:59:00`;
}

function toRawCalendarEvent(event: GoogleCalendarEvent, calendarId: string, calendarName: string): RawCalendarEvent | null {
  if (!event.id || event.status === "cancelled") {
    return null;
  }

  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const startsAt = event.start?.dateTime ?? (event.start?.date ? allDayDueDate(event.start.date) : undefined);
  const endsAt = event.end?.dateTime ?? (event.end?.date ? allDayDueDate(event.end.date) : undefined);

  if (!startsAt || !endsAt) {
    return null;
  }

  return {
    id: `${calendarId}:${event.id}`,
    sourceCalendarId: calendarId,
    title: event.summary?.trim() || "Untitled event",
    description: event.description?.trim() || "",
    location: event.location?.trim() || undefined,
    startsAt,
    endsAt,
    isRecurring: Boolean(event.recurringEventId),
    isAllDay,
    calendarName,
  };
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new LiveStoreError("Google OAuth environment is incomplete.", "schema_missing");
  }

  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new LiveStoreError("Unable to refresh the Google access token.", "schema_missing");
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new LiveStoreError("Google token response did not include an access token.", "schema_missing");
  }

  return payload.access_token;
}

async function fetchVisibleGoogleCalendars(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new LiveStoreError("Unable to fetch Google calendar list.", "schema_missing");
  }

  const payload = (await response.json()) as GoogleCalendarListResponse;
  return (payload.items ?? [])
    .filter((calendar) => calendar.selected !== false)
    .map((calendar) => ({
      id: calendar.id,
      name: calendar.summary?.trim() || calendar.id,
    }));
}

async function fetchUpcomingGoogleEvents(refreshToken: string): Promise<RawCalendarEvent[]> {
  const accessToken = await refreshGoogleAccessToken(refreshToken);
  const calendars = await fetchVisibleGoogleCalendars(accessToken);
  const now = new Date();
  const endWindow = new Date(now);
  endWindow.setDate(endWindow.getDate() + 14);

  const eventGroups = await Promise.all(
    calendars.map(async (calendar) => {
      const params = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        timeMin: now.toISOString(),
        timeMax: endWindow.toISOString(),
        maxResults: "250",
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as GoogleCalendarResponse;
      return (payload.items ?? [])
        .map((event) => toRawCalendarEvent(event, calendar.id, calendar.name))
        .filter((event): event is RawCalendarEvent => Boolean(event));
    }),
  );

  return eventGroups.flat().sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function taskPayload(userId: string, task: NormalizedTask) {
  return {
    user_id: userId,
    source_event_id: task.sourceEventId,
    source_system: "google_calendar",
    title: task.title,
    assignment_type: task.assignmentType,
    subject: task.subject,
    due_date: task.dueDate,
    recommended_start_time: task.recommendedStartTime,
    actual_start_time: task.actualStartTime ?? null,
    submission_time: task.submissionTime ?? null,
    time_taken_minutes: task.progress.elapsedMinutes || null,
    predicted_delay_minutes: task.predictedDelayMinutes,
    predicted_completion_time_minutes: task.predictedCompletionTimeMinutes,
    risk_probability: task.riskProbability,
    success_probability_before: task.successProbabilityBefore,
    success_probability_after: task.successProbabilityAfter,
    confidence_score: task.confidenceScore,
    estimated_effort_minutes_base: task.estimatedEffortMinutesBase,
    estimated_effort_minutes_adjusted: task.estimatedEffortMinutesAdjusted,
    task_status: task.taskStatus,
    raw_title: task.rawTitle,
    raw_description: task.rawDescription,
    task_priority: task.taskPriority,
    is_movable: false,
  };
}

function schedulePayload(userId: string, event: ScheduleEvent) {
  return {
    user_id: userId,
    source_event_id: event.sourceEventId ?? null,
    title: event.title,
    event_category: event.eventCategory,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    is_movable: event.isMovable,
    movement_cost_score: event.movementCostScore,
  };
}

function notificationPayload(userId: string, notification: NotificationPayload) {
  return {
    user_id: userId,
    task_id: notification.taskId ?? null,
    intervention_id: notification.interventionId ?? null,
    channel: notification.channel,
    notification_type: notification.channel === "email" ? "risk_alert" : "voice_reminder",
    payload_json: {
      subject: notification.subject,
      preview: notification.preview,
      body: notification.body,
    },
    sent_at: notification.sentAt ?? new Date().toISOString(),
    delivery_status: notification.deliveryStatus,
  };
}

function canReplaceExistingSubtasks(subtasks: Subtask[]): boolean {
  if (subtasks.length === 0) {
    return true;
  }

  return subtasks.every(
    (subtask) =>
      subtask.status === "pending" &&
      subtask.sourceMode !== "user_edited" &&
      !subtask.startedAt &&
      !subtask.completedAt,
  );
}

export async function syncGoogleCalendarForCurrentUser(): Promise<{ importedEvents: number; tasks: number }> {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    throw new LiveStoreError("You must sign in before syncing Google Calendar.", "unauthenticated");
  }

  const supabase = getSupabaseAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id,email,full_name,timezone")
    .eq("id", session.user.id)
    .maybeSingle<UserRow>();

  if (!user) {
    throw new LiveStoreError("Your user record is missing. Sign in again to reconnect.", "schema_missing");
  }

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id,user_id,encrypted_refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")
    .maybeSingle<ConnectionRow>();

  if (!connection?.encrypted_refresh_token) {
    throw new LiveStoreError("Google Calendar is connected, but no refresh token is stored yet.", "schema_missing");
  }

  const rawEvents = await fetchUpcomingGoogleEvents(connection.encrypted_refresh_token);
  const nowIso = new Date().toISOString();
  const { tasks: detectedTasks, scheduleEvents } = normalizeEvents(rawEvents, user.id, nowIso);

  const [{ data: existingTaskRows }, { data: observationRows }] = await Promise.all([
    supabase.from("tasks").select("id,source_event_id,actual_start_time,submission_time,task_status").eq("user_id", user.id),
    supabase.from("task_observations").select("*").eq("user_id", user.id),
  ]);

  const existingTaskIds = ((existingTaskRows ?? []) as ExistingTaskRow[]).map((row) => row.id);
  const { data: existingSubtaskRows } =
    existingTaskIds.length > 0
      ? await supabase.from("subtasks").select("*").in("task_id", existingTaskIds).order("sequence_index", { ascending: true })
      : { data: [] };

  const existingTasksBySourceEvent = new Map(
    ((existingTaskRows ?? []) as ExistingTaskRow[])
      .filter((row) => row.source_event_id)
      .map((row) => [row.source_event_id as string, row]),
  );
  const dismissedSourceEventIds = new Set(
    ((existingTaskRows ?? []) as ExistingTaskRow[])
      .filter((row) => row.task_status === "dismissed" && row.source_event_id)
      .map((row) => row.source_event_id as string),
  );
  const normalizedTasks = detectedTasks.filter((task) => !dismissedSourceEventIds.has(task.sourceEventId));
  const existingSubtasksByTaskId = new Map<string, Subtask[]>();
  for (const row of (existingSubtaskRows ?? []) as ExistingSubtaskRow[]) {
    const list = existingSubtasksByTaskId.get(row.task_id) ?? [];
    list.push(mapExistingSubtask(row));
    existingSubtasksByTaskId.set(row.task_id, list);
  }

  const assignmentTypeByTaskId = new Map<string, NormalizedTask["assignmentType"]>();
  for (const task of normalizedTasks) {
    const existing = existingTasksBySourceEvent.get(task.sourceEventId);
    if (existing?.id) {
      assignmentTypeByTaskId.set(existing.id, task.assignmentType);
    }
  }

  const observations = ((observationRows ?? []) as ObservationRow[]).map((row) =>
    mapObservation(row, user.id, assignmentTypeByTaskId.get(row.task_id) ?? "other"),
  );
  const profile = buildDistortionProfile(user.id, observations);

  await supabase.from("raw_calendar_events").delete().eq("user_id", user.id);
  if (rawEvents.length > 0) {
    await supabase.from("raw_calendar_events").insert(
      rawEvents.map((event) => ({
        user_id: user.id,
        source_event_id: event.id,
        source_calendar_id: event.sourceCalendarId,
        title_raw: event.title,
        description_raw: event.description,
        location_raw: event.location ?? null,
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        event_type_detected: /due|assignment|essay|worksheet|homework/i.test(`${event.title} ${event.description}`) ? "assignment" : "calendar_event",
        is_recurring: event.isRecurring,
        is_all_day: event.isAllDay,
        payload_json: {
          calendar_name: event.calendarName,
        },
      })),
    );
  }

  await supabase.from("schedule_events").delete().eq("user_id", user.id);
  if (scheduleEvents.length > 0) {
    await supabase.from("schedule_events").insert(scheduleEvents.map((event) => schedulePayload(user.id, event)));
  }

  const persistedTaskStates: PersistedTaskState[] = [];

  for (const task of normalizedTasks) {
    const existingTask = existingTasksBySourceEvent.get(task.sourceEventId);
    const basePayload = taskPayload(user.id, task);

    const { data: persistedTask, error: taskError } = existingTask
      ? await supabase.from("tasks").update(basePayload).eq("id", existingTask.id).select("id").single<{ id: string }>()
      : await supabase.from("tasks").insert(basePayload).select("id").single<{ id: string }>();

    if (taskError || !persistedTask) {
      throw new LiveStoreError(`Unable to persist task "${task.title}".`, "schema_missing");
    }

    const taskId = persistedTask.id;
    const subtasks = existingSubtasksByTaskId.get(taskId) ?? [];
    const shouldGenerateRefinedSubtasks = canReplaceExistingSubtasks(subtasks);

    persistedTaskStates.push({
      task,
      taskId,
      existingSubtasks: subtasks,
      shouldGenerateRefinedSubtasks,
    });
  }

  const refinedTasks = persistedTaskStates
    .filter((state) => state.shouldGenerateRefinedSubtasks)
    .map((state) => ({ ...state.task, id: state.taskId }));
  const generatedSubtasksByTaskId = await generateRefinedSubtasksBatched(refinedTasks);

  const hydratedTasks: NormalizedTask[] = [];

  for (const state of persistedTaskStates) {
    let subtasks = state.existingSubtasks;

    if (state.shouldGenerateRefinedSubtasks) {
      const generatedSubtasks = generatedSubtasksByTaskId.get(state.taskId) ?? generateSubtasks({ ...state.task, id: state.taskId });

      if (subtasks.length > 0) {
        const existingIds = subtasks.map((subtask) => subtask.id);
        await supabase.from("subtasks").delete().in("id", existingIds);
      }

      const { data: insertedSubtasks, error: subtaskError } = await supabase
        .from("subtasks")
        .insert(
          generatedSubtasks.map((subtask) => ({
            task_id: state.taskId,
            title: subtask.title,
            instructions: subtask.instructions,
            sequence_index: subtask.sequence,
            estimated_minutes: subtask.estimatedMinutes,
            status: subtask.status,
            started_at: subtask.startedAt ?? null,
            completed_at: subtask.completedAt ?? null,
            is_submission_step: subtask.isSubmissionStep,
            source_mode: subtask.sourceMode,
          })),
        )
        .select("*");

      if (subtaskError) {
        throw new LiveStoreError(`Unable to persist subtasks for "${state.task.title}".`, "schema_missing");
      }

      subtasks = ((insertedSubtasks ?? []) as ExistingSubtaskRow[]).map(mapExistingSubtask);
    }

    const progress = buildProgress(subtasks);
    const hydratedTask: NormalizedTask = {
      ...state.task,
      id: state.taskId,
      actualStartTime: progress.derivedStartTime,
      submissionTime: progress.derivedCompletionTime,
      predictedDelayMinutes: progress.derivedStartTime ? 0 : profile.meanStartDelayMinutes,
      predictedCompletionTimeMinutes: state.task.estimatedEffortMinutesBase + (progress.derivedStartTime ? 0 : profile.meanStartDelayMinutes),
      taskStatus: deriveTaskStatus({
        ...state.task,
        id: state.taskId,
        subtasks,
        progress,
      }),
      subtasks,
      progress,
    };

    hydratedTasks.push(hydratedTask);
  }

  const risks = hydratedTasks.map((task) => assessRisk(task, scheduleEvents, profile, nowIso));
  const tasksWithRisk = hydratedTasks.map((task) => {
    const risk = risks.find((entry) => entry.taskId === task.id);
    return risk
      ? {
          ...task,
          riskProbability: risk.riskProbability,
          successProbabilityBefore: risk.successProbability,
          estimatedEffortMinutesAdjusted: risk.predictedRequiredMinutes,
          explanation: risk.explanation,
        }
      : task;
  });

  const highestRiskTask = [...tasksWithRisk]
    .filter((task) => task.riskProbability > 0.01 && task.taskStatus !== "submitted" && task.taskStatus !== "completed")
    .sort((left, right) => right.riskProbability - left.riskProbability)[0];
  const highestRisk = risks.find((entry) => entry.taskId === highestRiskTask?.id);
  const intervention = generateIntervention(highestRiskTask, highestRisk, scheduleEvents, profile, nowIso);
  const notifications = buildNotifications(highestRiskTask, highestRisk, intervention);

  await supabase.from("distortion_profiles").insert({
    user_id: user.id,
    profile_version: profile.profileVersion,
    programming_underestimate_multiplier: profile.underestimationMultipliers.programming_assignment,
    essay_underestimate_multiplier: profile.underestimationMultipliers.essay,
    problem_set_underestimate_multiplier: profile.underestimationMultipliers.problem_set,
    generic_underestimate_multiplier: profile.underestimationMultipliers.other,
    mean_start_delay_minutes: profile.meanStartDelayMinutes,
    mean_submission_offset_minutes: profile.meanSubmissionOffsetMinutes,
    best_focus_start_hour: profile.bestFocusStartHour,
    best_focus_end_hour: profile.bestFocusEndHour,
    preferred_days_json: profile.preferredDays,
    confidence_level: profile.confidenceLevel,
    source_mode: profile.sourceMode,
    availability_mismatch_score: profile.availabilityMismatchScore,
    reliability_score: profile.reliabilityScore,
  });

  await supabase.from("risk_assessments").delete().eq("user_id", user.id);
  if (risks.length > 0) {
    await supabase.from("risk_assessments").insert(
      risks.map((risk) => ({
        user_id: user.id,
        task_id: risk.taskId,
        assessed_at: risk.assessedAt,
        risk_probability: risk.riskProbability,
        success_probability: risk.successProbability,
        risk_level: risk.riskLevel,
        explanation_json: { explanation: risk.explanation },
        available_minutes_before_due: risk.availableMinutesBeforeDue,
        predicted_required_minutes: risk.predictedRequiredMinutes,
        bottleneck_type: risk.bottleneckType,
      })),
    );
  }

  await supabase.from("interventions").delete().eq("user_id", user.id);
  if (intervention) {
    await supabase.from("interventions").insert({
      user_id: user.id,
      task_id: intervention.taskId,
      created_at: intervention.createdAt,
      intervention_type: intervention.interventionType,
      summary_text: intervention.summaryText,
      rationale_text: intervention.rationaleText,
      success_probability_before: intervention.successProbabilityBefore,
      success_probability_after: intervention.successProbabilityAfter,
      risk_probability_before: intervention.riskProbabilityBefore,
      risk_probability_after: intervention.riskProbabilityAfter,
      calendar_changes_json: intervention.calendarChanges,
      status: intervention.status,
    });
  }

  await supabase.from("notifications").delete().eq("user_id", user.id);
  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications.map((notification) => notificationPayload(user.id, notification)));
  }

  for (const task of tasksWithRisk) {
    const risk = risks.find((entry) => entry.taskId === task.id);
    await supabase
      .from("tasks")
      .update({
        actual_start_time: task.actualStartTime ?? null,
        submission_time: task.submissionTime ?? null,
        time_taken_minutes: task.progress.elapsedMinutes || null,
        predicted_delay_minutes: task.predictedDelayMinutes,
        predicted_completion_time_minutes: task.predictedCompletionTimeMinutes,
        risk_probability: risk?.riskProbability ?? task.riskProbability,
        success_probability_before: risk?.successProbability ?? task.successProbabilityBefore,
        success_probability_after:
          intervention && intervention.taskId === task.id ? intervention.successProbabilityAfter : task.successProbabilityAfter,
        estimated_effort_minutes_adjusted: risk?.predictedRequiredMinutes ?? task.estimatedEffortMinutesAdjusted,
        task_status: task.taskStatus,
      })
      .eq("id", task.id)
      .eq("user_id", user.id);
  }

  await supabase
    .from("calendar_connections")
    .update({
      last_sync_at: nowIso,
    })
    .eq("id", connection.id);

  return {
    importedEvents: rawEvents.length,
    tasks: tasksWithRisk.length,
  };
}
