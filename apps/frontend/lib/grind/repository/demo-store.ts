import { createInitialDemoState } from "../demo/seed";
import type { DemoRepositoryState, Subtask, VoiceIntent } from "../contracts";
import { runPipeline } from "./pipeline";

declare global {
  // eslint-disable-next-line no-var
  var __grindDemoState: DemoRepositoryState | undefined;
}

function getState(): DemoRepositoryState {
  if (!global.__grindDemoState) {
    global.__grindDemoState = createInitialDemoState();
  }
  return global.__grindDemoState;
}

function updateSubtaskEdit(taskId: string, subtaskId: string, patch: Partial<Subtask>) {
  const state = getState();
  const key = `${taskId}:${subtaskId}`;
  state.subtaskEdits[key] = {
    ...state.subtaskEdits[key],
    ...patch,
  };
}

export function getScenarioSnapshot() {
  return runPipeline(getState());
}

export function rerunScenario() {
  const state = getState();
  state.rerunCount += 1;
  state.lastSyncedAt = new Date().toISOString();
  return runPipeline(state);
}

export function startSubtask(taskId: string, subtaskId: string) {
  updateSubtaskEdit(taskId, subtaskId, {
    status: "in_progress",
    startedAt: new Date().toISOString(),
  });
  return runPipeline(getState());
}

export function completeSubtask(taskId: string, subtaskId: string) {
  updateSubtaskEdit(taskId, subtaskId, {
    status: "completed",
    startedAt: getState().subtaskEdits[`${taskId}:${subtaskId}`]?.startedAt ?? new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
  return runPipeline(getState());
}

export function renameSubtask(taskId: string, subtaskId: string, title: string) {
  updateSubtaskEdit(taskId, subtaskId, {
    title,
    sourceMode: "user_edited",
  });
  return runPipeline(getState());
}

export function recordVoiceIntent(callId: string, intent: VoiceIntent) {
  const state = getState();
  state.callResponses[callId] = intent;

  const snapshot = runPipeline(state);
  if (intent === "start_now" && snapshot.highestRiskTask) {
    const firstPending = snapshot.highestRiskTask.subtasks.find((subtask) => subtask.status === "pending");
    if (firstPending) {
      updateSubtaskEdit(snapshot.highestRiskTask.id, firstPending.id, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });
    }
  }
  return runPipeline(state);
}
