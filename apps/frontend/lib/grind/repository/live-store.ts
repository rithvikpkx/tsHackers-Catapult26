import "server-only";

import { auth } from "@/auth";
import type {
  DistortionProfileSummary,
  GrindUser,
  InterventionProposal,
  NormalizedTask,
  NotificationPayload,
  RiskAssessment,
  ScenarioSnapshot,
  ScheduleEvent,
  Subtask,
} from "@/lib/grind/contracts";
import { getIntegrationStatus } from "@/lib/grind/config/env";
import { buildDistortionProfile } from "@/lib/grind/profile/model";
import { getSupabaseAdminClient } from "@/lib/grind/supabase/admin";
import { buildProgress, deriveTaskStatus } from "@/lib/grind/tasks/progress";

type TaskRow = {
  id: string;
  user_id: string;
  source_event_id: string | null;
  title: string;
  assignment_type: NormalizedTask["assignmentType"];
  subject: string;
  due_date: string;
  recommended_start_time: string | null;
  actual_start_time: string | null;
  submission_time: string | null;
  estimated_effort_minutes_base: number;
  estimated_effort_minutes_adjusted: number;
  predicted_delay_minutes: number | null;
  predicted_completion_time_minutes: number | null;
  risk_probability: number;
  success_probability_before: number;
  success_probability_after: number;
  confidence_score: number;
  task_status: string;
  raw_title: string | null;
  raw_description: string | null;
  task_priority: "low" | "medium" | "high";
};

type SubtaskRow = {
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

type ProfileRow = {
  user_id: string;
  profile_version: number;
  programming_underestimate_multiplier: number;
  essay_underestimate_multiplier: number;
  problem_set_underestimate_multiplier: number;
  generic_underestimate_multiplier: number;
  mean_start_delay_minutes: number;
  mean_submission_offset_minutes: number;
  best_focus_start_hour: number;
  best_focus_end_hour: number;
  preferred_days_json: string[] | null;
  confidence_level: DistortionProfileSummary["confidenceLevel"];
  source_mode: DistortionProfileSummary["sourceMode"];
  availability_mismatch_score: number;
  reliability_score: number;
};

type RiskRow = {
  id: string;
  task_id: string;
  assessed_at: string;
  risk_probability: number;
  success_probability: number;
  risk_level: RiskAssessment["riskLevel"];
  available_minutes_before_due: number;
  predicted_required_minutes: number;
  bottleneck_type: RiskAssessment["bottleneckType"];
};

type InterventionRow = {
  id: string;
  task_id: string;
  created_at: string;
  intervention_type: InterventionProposal["interventionType"];
  summary_text: string;
  rationale_text: string;
  success_probability_before: number;
  success_probability_after: number;
  risk_probability_before: number;
  risk_probability_after: number;
  calendar_changes_json: InterventionProposal["calendarChanges"];
  status: InterventionProposal["status"];
};

type NotificationRow = {
  id: string;
  task_id: string | null;
  intervention_id: string | null;
  channel: NotificationPayload["channel"];
  payload_json: Record<string, unknown>;
  delivery_status: NotificationPayload["deliveryStatus"];
  sent_at: string | null;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  timezone: string | null;
};

type RawEventRow = {
  source_event_id: string;
  source_calendar_id: string | null;
  title_raw: string;
  description_raw: string | null;
  location_raw: string | null;
  starts_at: string;
  ends_at: string;
  is_recurring: boolean;
  is_all_day: boolean;
  payload_json: Record<string, unknown>;
};

type ScheduleEventRow = {
  id: string;
  user_id: string;
  source_event_id: string | null;
  title: string;
  event_category: ScheduleEvent["eventCategory"];
  starts_at: string;
  ends_at: string;
  is_movable: boolean;
  movement_cost_score: number;
};

export type LiveStoreErrorCode = "unauthenticated" | "schema_missing";

export class LiveStoreError extends Error {
  constructor(
    message: string,
    public readonly code: LiveStoreErrorCode,
  ) {
    super(message);
  }
}

export function buildGuestScenario(headline = "Connect Google Calendar to begin."): ScenarioSnapshot {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    user: {
      id: "guest",
      email: "",
      fullName: "Guest",
      timezone: "America/Indiana/Indianapolis",
      googleConnected: false,
      calendarWriteMode: "mirrored_proposal",
    },
    rawEvents: [],
    scheduleEvents: [],
    tasks: [],
    highestRiskTask: undefined,
    profile: buildDistortionProfile("guest", []),
    risks: [],
    intervention: undefined,
    notifications: [],
    voiceCall: undefined,
    integrations: getIntegrationStatus(),
    story: {
      headline,
      pulseLabel: "No live data yet",
      beforeToAfter: "No intervention needed",
    },
  };
}

function mapProfile(profile: ProfileRow | null, userId: string): DistortionProfileSummary {
  if (!profile) {
    return buildDistortionProfile(userId, []);
  }

  return {
    userId,
    profileVersion: profile.profile_version,
    underestimationMultipliers: {
      essay: profile.essay_underestimate_multiplier,
      problem_set: profile.problem_set_underestimate_multiplier,
      programming_assignment: profile.programming_underestimate_multiplier,
      worksheet: profile.generic_underestimate_multiplier,
      quiz_prep: profile.generic_underestimate_multiplier,
      exam_prep: profile.generic_underestimate_multiplier,
      reading: profile.generic_underestimate_multiplier,
      discussion_post: profile.generic_underestimate_multiplier,
      lab: profile.generic_underestimate_multiplier,
      project: profile.generic_underestimate_multiplier,
      other: profile.generic_underestimate_multiplier,
    },
    meanStartDelayMinutes: profile.mean_start_delay_minutes,
    meanSubmissionOffsetMinutes: profile.mean_submission_offset_minutes,
    bestFocusStartHour: profile.best_focus_start_hour,
    bestFocusEndHour: profile.best_focus_end_hour,
    preferredDays: profile.preferred_days_json ?? [],
    reliabilityScore: profile.reliability_score,
    availabilityMismatchScore: profile.availability_mismatch_score,
    confidenceLevel: profile.confidence_level,
    sourceMode: profile.source_mode,
    highlights: [],
  };
}

function mapTask(task: TaskRow, subtasks: Subtask[]): NormalizedTask {
  const progress = buildProgress(subtasks);
  return {
    id: task.id,
    userId: task.user_id,
    sourceEventId: task.source_event_id ?? "",
    sourceSystem: "google_calendar",
    title: task.title,
    rawTitle: task.raw_title ?? task.title,
    rawDescription: task.raw_description ?? "",
    assignmentType: task.assignment_type,
    subject: task.subject,
    dueDate: task.due_date,
    recommendedStartTime: task.recommended_start_time ?? task.due_date,
    actualStartTime: task.actual_start_time ?? undefined,
    submissionTime: task.submission_time ?? undefined,
    estimatedEffortMinutesBase: task.estimated_effort_minutes_base,
    estimatedEffortMinutesAdjusted: task.estimated_effort_minutes_adjusted,
    predictedDelayMinutes: task.predicted_delay_minutes ?? 0,
    predictedCompletionTimeMinutes: task.predicted_completion_time_minutes ?? 0,
    riskProbability: Number(task.risk_probability ?? 0),
    successProbabilityBefore: Number(task.success_probability_before ?? 0),
    successProbabilityAfter: Number(task.success_probability_after ?? 0),
    confidenceScore: Number(task.confidence_score ?? 0),
    taskStatus: deriveTaskStatus({
      ...({
        id: task.id,
        userId: task.user_id,
        sourceEventId: task.source_event_id ?? "",
        sourceSystem: "google_calendar",
        title: task.title,
        rawTitle: task.raw_title ?? task.title,
        rawDescription: task.raw_description ?? "",
        assignmentType: task.assignment_type,
        subject: task.subject,
        dueDate: task.due_date,
        recommendedStartTime: task.recommended_start_time ?? task.due_date,
        estimatedEffortMinutesBase: task.estimated_effort_minutes_base,
        estimatedEffortMinutesAdjusted: task.estimated_effort_minutes_adjusted,
        predictedDelayMinutes: task.predicted_delay_minutes ?? 0,
        predictedCompletionTimeMinutes: task.predicted_completion_time_minutes ?? 0,
        riskProbability: Number(task.risk_probability ?? 0),
        successProbabilityBefore: Number(task.success_probability_before ?? 0),
        successProbabilityAfter: Number(task.success_probability_after ?? 0),
        confidenceScore: Number(task.confidence_score ?? 0),
        isMovable: false,
        taskPriority: task.task_priority,
        confidenceLabel: "medium",
        explanation: "",
        subtasks,
        progress,
      } satisfies Omit<NormalizedTask, "taskStatus" | "actualStartTime" | "submissionTime">),
      taskStatus: "upcoming",
      actualStartTime: task.actual_start_time ?? undefined,
      submissionTime: task.submission_time ?? undefined,
    }),
    isMovable: false,
    taskPriority: task.task_priority,
    confidenceLabel: task.confidence_score > 0.8 ? "high" : task.confidence_score > 0.55 ? "medium" : "low",
    explanation: "",
    subtasks,
    progress,
  };
}

export async function getLiveScenarioSnapshot(): Promise<ScenarioSnapshot> {
  const session = await auth();
  if (!session?.user?.email) {
    return buildGuestScenario();
  }

  const supabase = getSupabaseAdminClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,email,full_name,timezone")
    .eq("email", session.user.email)
    .single<UserRow>();

  if (userError || !user) {
    throw new LiveStoreError("Supabase schema is not ready or user row is missing.", "schema_missing");
  }

  await getSupabaseAdminClient()
    .from("tasks")
    .delete()
    .eq("user_id", user.id)
    .like("source_event_id", "starter-%");

  const [{ data: taskRows, error: tasksError }, { data: rawEventRows }, { data: scheduleEventRows }, { data: profileRow }, { data: riskRows }, { data: interventionRows }, { data: notificationRows }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .neq("task_status", "dismissed")
        .gte("due_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("due_date", { ascending: true }),
      supabase.from("raw_calendar_events").select("*").eq("user_id", user.id).order("starts_at", { ascending: true }).limit(30),
      supabase.from("schedule_events").select("*").eq("user_id", user.id).order("starts_at", { ascending: true }).limit(30),
      supabase.from("distortion_profiles").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle<ProfileRow>(),
      supabase.from("risk_assessments").select("*").eq("user_id", user.id).order("assessed_at", { ascending: false }),
      supabase.from("interventions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user.id).order("sent_at", { ascending: false }),
    ]);

  if (tasksError) {
    throw new LiveStoreError("Supabase schema is not ready for task reads.", "schema_missing");
  }

  const taskIds = ((taskRows ?? []) as TaskRow[]).map((row) => row.id);
  const { data: subtaskRows } =
    taskIds.length > 0
      ? await supabase.from("subtasks").select("*").in("task_id", taskIds).order("sequence_index", { ascending: true })
      : { data: [] };

  const subtasksByTaskId = new Map<string, Subtask[]>();
  for (const row of (subtaskRows ?? []) as SubtaskRow[]) {
    const mapped: Subtask = {
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

    const list = subtasksByTaskId.get(row.task_id) ?? [];
    list.push(mapped);
    subtasksByTaskId.set(row.task_id, list);
  }

  const tasks = ((taskRows ?? []) as TaskRow[]).map((row) => mapTask(row, subtasksByTaskId.get(row.id) ?? []));
  const rawEvents = ((rawEventRows ?? []) as RawEventRow[]).map((row) => ({
    id: row.source_event_id,
    sourceCalendarId: row.source_calendar_id ?? "unknown",
    title: row.title_raw,
    description: row.description_raw ?? "",
    location: row.location_raw ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isRecurring: row.is_recurring,
    isAllDay: row.is_all_day,
    calendarName: typeof row.payload_json?.calendar_name === "string" ? row.payload_json.calendar_name : "Calendar",
  }));
  const scheduleEvents: ScheduleEvent[] = ((scheduleEventRows ?? []) as ScheduleEventRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    sourceEventId: row.source_event_id ?? undefined,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    eventCategory: row.event_category,
    isMovable: row.is_movable,
    movementCostScore: Number(row.movement_cost_score),
    summary:
      row.event_category === "class"
        ? "Upcoming class"
        : row.is_movable
          ? "Flexible calendar event"
          : "Upcoming calendar event",
  }));

  const risks: RiskAssessment[] = ((riskRows ?? []) as RiskRow[]).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    assessedAt: row.assessed_at,
    riskProbability: Number(row.risk_probability),
    successProbability: Number(row.success_probability),
    riskLevel: row.risk_level,
    explanation: "",
    availableMinutesBeforeDue: row.available_minutes_before_due,
    predictedRequiredMinutes: row.predicted_required_minutes,
    bottleneckType: row.bottleneck_type,
    scheduleFragmentationScore: 0,
  }));

  const interventions: InterventionProposal[] = ((interventionRows ?? []) as InterventionRow[]).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    createdAt: row.created_at,
    interventionType: row.intervention_type,
    summaryText: row.summary_text,
    rationaleText: row.rationale_text,
    successProbabilityBefore: Number(row.success_probability_before),
    successProbabilityAfter: Number(row.success_probability_after),
    riskProbabilityBefore: Number(row.risk_probability_before),
    riskProbabilityAfter: Number(row.risk_probability_after),
    calendarChanges: row.calendar_changes_json ?? [],
    status: row.status,
  }));

  const notifications: NotificationPayload[] = ((notificationRows ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    channel: row.channel,
    taskId: row.task_id ?? undefined,
    interventionId: row.intervention_id ?? undefined,
    subject: typeof row.payload_json?.subject === "string" ? row.payload_json.subject : "Notification",
    preview: typeof row.payload_json?.preview === "string" ? row.payload_json.preview : "",
    body: typeof row.payload_json?.body === "string" ? row.payload_json.body : "",
    deliveryStatus: row.delivery_status,
    sentAt: row.sent_at ?? undefined,
  }));

  const highestRiskTask = [...tasks].sort((left, right) => right.riskProbability - left.riskProbability)[0];
  const selectedIntervention = interventions.find((entry) => entry.taskId === highestRiskTask?.id) ?? interventions[0];

  const liveUser: GrindUser = {
    id: user.id,
    email: user.email,
    fullName: user.full_name ?? "Grind user",
    timezone: user.timezone ?? "America/Indiana/Indianapolis",
    googleConnected: true,
    calendarWriteMode: "mirrored_proposal",
  };

  return {
    generatedAt: new Date().toISOString(),
    user: liveUser,
    rawEvents,
    scheduleEvents,
    tasks,
    highestRiskTask,
    profile: mapProfile(profileRow as ProfileRow | null, user.id),
    risks,
    intervention: selectedIntervention,
    notifications,
    voiceCall: undefined,
    integrations: getIntegrationStatus(),
    story: {
      headline: highestRiskTask
        ? `${highestRiskTask.title} is at ${Math.round(highestRiskTask.riskProbability * 100)}% risk.`
        : rawEvents.length > 0
          ? "Calendar connected. Upcoming classes and deadlines are loaded."
          : "Calendar connected.",
      pulseLabel: selectedIntervention
        ? `Success probability ${Math.round(selectedIntervention.successProbabilityBefore * 100)}% -> ${Math.round(selectedIntervention.successProbabilityAfter * 100)}%`
        : "No intervention yet",
      beforeToAfter: selectedIntervention
        ? `${Math.round(selectedIntervention.successProbabilityBefore * 100)}% -> ${Math.round(selectedIntervention.successProbabilityAfter * 100)}%`
        : "No intervention needed",
    },
  };
}

export async function updateLiveSubtask(taskId: string, subtaskId: string, patch: Partial<Subtask>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new LiveStoreError("You must sign in to update a task.", "unauthenticated");
  }

  const supabase = getSupabaseAdminClient();
  const updatePayload: Record<string, unknown> = {};
  if (patch.title !== undefined) updatePayload.title = patch.title;
  if (patch.status !== undefined) updatePayload.status = patch.status;
  if (patch.startedAt !== undefined) updatePayload.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) updatePayload.completed_at = patch.completedAt;
  if (patch.sourceMode !== undefined) updatePayload.source_mode = patch.sourceMode;

  const { error } = await supabase.from("subtasks").update(updatePayload).eq("id", subtaskId).eq("task_id", taskId);
  if (error) {
    throw new LiveStoreError(`Unable to update subtask: ${error.message}`, "schema_missing");
  }

  const { data: subtasks } = await supabase
    .from("subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("sequence_index", { ascending: true });

  const mappedSubtasks = ((subtasks ?? []) as SubtaskRow[]).map((row) => ({
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
  }));

  const progress = buildProgress(mappedSubtasks);
  const taskStatus = mappedSubtasks.length > 0 && progress.completedSubtasks === mappedSubtasks.length ? "submitted" : progress.derivedStartTime ? "in_progress" : "upcoming";

  await supabase
    .from("tasks")
    .update({
      actual_start_time: progress.derivedStartTime ?? null,
      submission_time: progress.derivedCompletionTime ?? null,
      task_status: taskStatus,
      time_taken_minutes: progress.elapsedMinutes || null,
    })
    .eq("id", taskId)
    .eq("user_id", session.user.id);

  if (taskStatus === "submitted" && progress.derivedStartTime && progress.derivedCompletionTime) {
    const { data: taskRow } = await supabase
      .from("tasks")
      .select("assignment_type,recommended_start_time,due_date,estimated_effort_minutes_base")
      .eq("id", taskId)
      .eq("user_id", session.user.id)
      .maybeSingle<{
        assignment_type: string;
        recommended_start_time: string | null;
        due_date: string;
        estimated_effort_minutes_base: number;
      }>();

    if (taskRow) {
      const derivedStartDelayMinutes = taskRow.recommended_start_time
        ? Math.max(
            0,
            Math.round(
              (new Date(progress.derivedStartTime).getTime() - new Date(taskRow.recommended_start_time).getTime()) / 60000,
            ),
          )
        : 0;
      const derivedSubmissionOffsetMinutes = Math.round(
        (new Date(taskRow.due_date).getTime() - new Date(progress.derivedCompletionTime).getTime()) / 60000,
      );

      await supabase.from("task_observations").insert({
        user_id: session.user.id,
        task_id: taskId,
        expected_start_time: taskRow.recommended_start_time,
        actual_start_time: progress.derivedStartTime,
        expected_effort_minutes: taskRow.estimated_effort_minutes_base,
        actual_effort_minutes: progress.elapsedMinutes || taskRow.estimated_effort_minutes_base,
        due_date: taskRow.due_date,
        submission_time: progress.derivedCompletionTime,
        derived_start_delay_minutes: derivedStartDelayMinutes,
        derived_submission_offset_minutes: derivedSubmissionOffsetMinutes,
      });
    }
  }
}

export async function dismissLiveTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new LiveStoreError("You must sign in to modify a task.", "unauthenticated");
  }

  const supabase = getSupabaseAdminClient();

  await supabase.from("notifications").delete().eq("user_id", session.user.id).eq("task_id", taskId);

  const { error } = await supabase
    .from("tasks")
    .update({
      task_status: "dismissed",
    })
    .eq("id", taskId)
    .eq("user_id", session.user.id);

  if (error) {
    throw new LiveStoreError(`Unable to dismiss task: ${error.message}`, "schema_missing");
  }
}
