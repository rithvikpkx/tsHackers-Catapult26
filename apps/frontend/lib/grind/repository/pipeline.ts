import { getIntegrationStatus } from "../config/env";
import type { DemoRepositoryState, NormalizedTask, ScenarioSnapshot, Subtask } from "../contracts";
import { createInitialDemoState, DEMO_NOW } from "../demo/seed";
import { generateIntervention } from "../interventions/generate";
import { buildNotifications } from "../notifications/build";
import { buildDistortionProfile } from "../profile/model";
import { assessRisk } from "../risk/score";
import { generateSubtasks } from "../tasks/decompose";
import { normalizeEvents } from "../tasks/normalize";
import { buildProgress, deriveTaskStatus } from "../tasks/progress";
import { buildVoiceCall } from "../voice/build";

function mergeSubtaskEdits(taskId: string, subtasks: Subtask[], subtaskEdits: DemoRepositoryState["subtaskEdits"]): Subtask[] {
  return subtasks.map((subtask) => {
    const patch = subtaskEdits[`${taskId}:${subtask.id}`];
    return patch ? { ...subtask, ...patch } : subtask;
  });
}

function hydrateTask(task: NormalizedTask, subtaskEdits: DemoRepositoryState["subtaskEdits"], profileDelayMinutes: number): NormalizedTask {
  const subtasks = mergeSubtaskEdits(task.id, generateSubtasks(task), subtaskEdits);
  const progress = buildProgress(subtasks);
  const predictedDelayMinutes = progress.derivedStartTime ? 0 : profileDelayMinutes;
  const predictedCompletionTimeMinutes = task.estimatedEffortMinutesBase + predictedDelayMinutes;

  return {
    ...task,
    subtasks,
    progress,
    actualStartTime: progress.derivedStartTime,
    submissionTime: progress.derivedCompletionTime,
    predictedDelayMinutes,
    predictedCompletionTimeMinutes,
    taskStatus: deriveTaskStatus({ ...task, subtasks, progress }),
  };
}

export function runPipeline(state: DemoRepositoryState = createInitialDemoState()): ScenarioSnapshot {
  const { tasks: rawTasks, scheduleEvents } = normalizeEvents(state.rawEvents, state.user.id, DEMO_NOW);
  const profile = buildDistortionProfile(state.user.id, state.observations);
  const tasks = rawTasks.map((task) => hydrateTask(task, state.subtaskEdits, profile.meanStartDelayMinutes));
  const risks = tasks.map((task) => assessRisk(task, scheduleEvents, profile, DEMO_NOW));

  const tasksWithRisk = tasks.map((task) => {
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

  const highestRiskTask = [...tasksWithRisk].sort((left, right) => right.riskProbability - left.riskProbability)[0];
  const highestRisk = risks.find((risk) => risk.taskId === highestRiskTask?.id);
  const intervention = generateIntervention(highestRiskTask, highestRisk, scheduleEvents, profile, DEMO_NOW);

  const hydratedTasks = tasksWithRisk.map((task) =>
    task.id === highestRiskTask?.id && intervention
      ? {
          ...task,
          successProbabilityAfter: intervention.successProbabilityAfter,
        }
      : task,
  );

  const notifications = buildNotifications(highestRiskTask, highestRisk, intervention);
  const voiceCall = buildVoiceCall(
    highestRiskTask,
    highestRisk,
    intervention,
    highestRiskTask ? state.callResponses[`voice-${highestRiskTask.id}`] : undefined,
  );

  return {
    generatedAt: DEMO_NOW,
    user: state.user,
    rawEvents: state.rawEvents,
    scheduleEvents,
    tasks: hydratedTasks,
    highestRiskTask: hydratedTasks.find((task) => task.id === highestRiskTask?.id),
    profile,
    risks,
    intervention,
    notifications,
    voiceCall,
    integrations: getIntegrationStatus(),
    story: {
      headline: highestRiskTask
        ? `${highestRiskTask.title} is at ${Math.round((highestRisk?.riskProbability ?? 0) * 100)}% risk.`
        : "No at-risk task detected.",
      pulseLabel:
        intervention && highestRisk
          ? `Success probability ${Math.round(intervention.successProbabilityBefore * 100)}% -> ${Math.round(intervention.successProbabilityAfter * 100)}%`
          : "Calendar looks stable.",
      beforeToAfter:
        intervention && highestRisk
          ? `${Math.round(intervention.successProbabilityBefore * 100)}% -> ${Math.round(intervention.successProbabilityAfter * 100)}%`
          : "No intervention needed",
    },
  };
}
