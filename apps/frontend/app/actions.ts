"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/lib/grind/config/env";
import { completeSubtask, recordVoiceIntent, renameSubtask, rerunScenario, startSubtask } from "@/lib/grind/repository/demo-store";
import { syncGoogleCalendarForCurrentUser } from "@/lib/grind/repository/live-sync";
import { updateLiveSubtask } from "@/lib/grind/repository/live-store";
import type { VoiceIntent } from "@/lib/grind/contracts";

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/interventions");
  revalidatePath("/profile");
  revalidatePath("/focus");
  revalidatePath("/admin");
}

export async function rerunDemoPipelineAction() {
  if (!env.demoMode) {
    return;
  }
  rerunScenario();
  refreshAll();
}

export async function syncGoogleCalendarAction() {
  if (env.demoMode) {
    rerunScenario();
  } else {
    await syncGoogleCalendarForCurrentUser();
  }
  refreshAll();
}

export async function startSubtaskAction(taskId: string, subtaskId: string) {
  if (env.demoMode) {
    startSubtask(taskId, subtaskId);
  } else {
    await updateLiveSubtask(taskId, subtaskId, {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });
  }
  refreshAll();
}

export async function completeSubtaskAction(taskId: string, subtaskId: string) {
  if (env.demoMode) {
    completeSubtask(taskId, subtaskId);
  } else {
    await updateLiveSubtask(taskId, subtaskId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });
  }
  refreshAll();
}

export async function renameSubtaskAction(taskId: string, subtaskId: string, title: string) {
  if (env.demoMode) {
    renameSubtask(taskId, subtaskId, title.trim());
  } else {
    await updateLiveSubtask(taskId, subtaskId, {
      title: title.trim(),
      sourceMode: "user_edited",
    });
  }
  refreshAll();
}

export async function respondToVoiceCallAction(callId: string, intent: VoiceIntent) {
  if (env.demoMode) {
    recordVoiceIntent(callId, intent);
  }
  refreshAll();
}
