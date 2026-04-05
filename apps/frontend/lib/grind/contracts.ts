export type AssignmentType =
  | "essay"
  | "problem_set"
  | "programming_assignment"
  | "worksheet"
  | "quiz_prep"
  | "exam_prep"
  | "reading"
  | "discussion_post"
  | "lab"
  | "project"
  | "other";

export type TaskStatus =
  | "upcoming"
  | "in_progress"
  | "submitted"
  | "completed"
  | "overdue"
  | "dismissed";

export type SubtaskStatus = "pending" | "in_progress" | "completed";

export type ConfidenceLevel = "low" | "medium" | "high";

export type SourceMode = "llm" | "heuristic" | "user_edited" | "demo_seed";

export type NotificationChannel = "email" | "voice";

export type VoiceIntent = "start_now" | "remind_me_later" | "acknowledged";

export type EventCategory = "assignment" | "class" | "meeting" | "personal" | "focus" | "proposal";

export type CalendarWriteMode = "mirrored_proposal" | "direct_write";

export type GrindUser = {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
  googleConnected: boolean;
  calendarWriteMode: CalendarWriteMode;
};

export type RawCalendarEvent = {
  id: string;
  sourceCalendarId: string;
  title: string;
  description: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  isRecurring: boolean;
  isAllDay: boolean;
  calendarName: string;
};

export type ScheduleEvent = {
  id: string;
  userId: string;
  sourceEventId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  eventCategory: EventCategory;
  isMovable: boolean;
  movementCostScore: number;
  summary: string;
};

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  instructions: string;
  sequence: number;
  estimatedMinutes: number;
  status: SubtaskStatus;
  startedAt?: string;
  completedAt?: string;
  isSubmissionStep: boolean;
  sourceMode: SourceMode;
};

export type TaskProgressSummary = {
  totalSubtasks: number;
  completedSubtasks: number;
  completionRatio: number;
  derivedStartTime?: string;
  derivedCompletionTime?: string;
  remainingMinutes: number;
  elapsedMinutes: number;
};

export type NormalizedTask = {
  id: string;
  userId: string;
  sourceEventId: string;
  sourceSystem: "google_calendar";
  title: string;
  rawTitle: string;
  rawDescription: string;
  assignmentType: AssignmentType;
  subject: string;
  dueDate: string;
  recommendedStartTime: string;
  actualStartTime?: string;
  submissionTime?: string;
  estimatedEffortMinutesBase: number;
  estimatedEffortMinutesAdjusted: number;
  predictedDelayMinutes: number;
  predictedCompletionTimeMinutes: number;
  riskProbability: number;
  successProbabilityBefore: number;
  successProbabilityAfter: number;
  confidenceScore: number;
  taskStatus: TaskStatus;
  isMovable: false;
  taskPriority: "low" | "medium" | "high";
  confidenceLabel: ConfidenceLevel;
  explanation: string;
  subtasks: Subtask[];
  progress: TaskProgressSummary;
};

export type TaskObservation = {
  id: string;
  userId: string;
  taskId: string;
  assignmentType: AssignmentType;
  expectedStartTime: string;
  actualStartTime: string;
  expectedEffortMinutes: number;
  actualEffortMinutes: number;
  dueDate: string;
  submissionTime: string;
  derivedStartDelayMinutes: number;
  derivedSubmissionOffsetMinutes: number;
  observedAt: string;
};

export type DistortionProfileSummary = {
  userId: string;
  profileVersion: number;
  underestimationMultipliers: Record<AssignmentType, number>;
  meanStartDelayMinutes: number;
  meanSubmissionOffsetMinutes: number;
  bestFocusStartHour: number;
  bestFocusEndHour: number;
  preferredDays: string[];
  reliabilityScore: number;
  availabilityMismatchScore: number;
  confidenceLevel: ConfidenceLevel;
  sourceMode: "weak_prior" | "blended" | "personalized";
  highlights: string[];
};

export type RiskAssessment = {
  id: string;
  taskId: string;
  assessedAt: string;
  riskProbability: number;
  successProbability: number;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
  availableMinutesBeforeDue: number;
  predictedRequiredMinutes: number;
  bottleneckType: "delay" | "capacity" | "fragmentation" | "ambiguity";
  scheduleFragmentationScore: number;
};

export type CalendarChange = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  changeType: "move" | "focus_block";
  detail: string;
};

export type InterventionProposal = {
  id: string;
  taskId: string;
  createdAt: string;
  interventionType: "focus_block" | "move_event" | "combined";
  summaryText: string;
  rationaleText: string;
  successProbabilityBefore: number;
  successProbabilityAfter: number;
  riskProbabilityBefore: number;
  riskProbabilityAfter: number;
  calendarChanges: CalendarChange[];
  status: "proposed" | "accepted" | "written" | "rejected" | "expired";
};

export type NotificationPayload = {
  id: string;
  channel: NotificationChannel;
  taskId?: string;
  interventionId?: string;
  subject: string;
  preview: string;
  body: string;
  deliveryStatus: "queued" | "sent" | "simulated";
  sentAt?: string;
};

export type VoiceCallScript = {
  id: string;
  taskId: string;
  interventionId?: string;
  title: string;
  opening: string;
  riskLine: string;
  actionLine: string;
  choices: Array<{
    intent: VoiceIntent;
    label: string;
  }>;
  status: "queued" | "placed" | "responded";
  userResponse?: VoiceIntent;
};

export type IntegrationStatus = {
  googleCalendar: "demo" | "ready" | "missing_credentials";
  supabase: "demo" | "ready" | "missing_credentials";
  resend: "demo" | "ready" | "missing_credentials";
  voice: "demo" | "ready" | "missing_credentials";
};

export type ScenarioSnapshot = {
  generatedAt: string;
  user: GrindUser;
  rawEvents: RawCalendarEvent[];
  scheduleEvents: ScheduleEvent[];
  tasks: NormalizedTask[];
  highestRiskTask?: NormalizedTask;
  profile: DistortionProfileSummary;
  risks: RiskAssessment[];
  intervention?: InterventionProposal;
  notifications: NotificationPayload[];
  voiceCall?: VoiceCallScript;
  integrations: IntegrationStatus;
  story: {
    headline: string;
    pulseLabel: string;
    beforeToAfter: string;
  };
};

export type DemoRepositoryState = {
  user: GrindUser;
  rawEvents: RawCalendarEvent[];
  observations: TaskObservation[];
  subtaskEdits: Record<string, Partial<Subtask>>;
  callResponses: Record<string, VoiceIntent>;
  rerunCount: number;
  lastSyncedAt?: string;
};
