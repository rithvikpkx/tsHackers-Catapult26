"use server";

import { revalidatePath } from "next/cache";
import { completeSubtask, recordVoiceIntent, renameSubtask, rerunScenario, startSubtask } from "@/lib/grind/repository/demo-store";
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
  rerunScenario();
  refreshAll();
}

export async function startSubtaskAction(taskId: string, subtaskId: string) {
  startSubtask(taskId, subtaskId);
  refreshAll();
}

export async function completeSubtaskAction(taskId: string, subtaskId: string) {
  completeSubtask(taskId, subtaskId);
  refreshAll();
}

export async function renameSubtaskAction(taskId: string, subtaskId: string, title: string) {
  renameSubtask(taskId, subtaskId, title.trim());
  refreshAll();
}

export async function respondToVoiceCallAction(callId: string, intent: VoiceIntent) {
  recordVoiceIntent(callId, intent);
  refreshAll();
}
