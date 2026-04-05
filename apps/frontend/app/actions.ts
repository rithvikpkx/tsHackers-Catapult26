"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { completeSubtask, recordVoiceIntent, renameSubtask, rerunScenario, startSubtask } from "@/lib/grind/repository/demo-store";
import type { VoiceIntent } from "@/lib/grind/contracts";
import {
  ONBOARDING_COOKIE_MAX_AGE,
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUE,
} from "@/lib/onboarding";

export type OnboardingActionState = {
  error?: string;
};

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/interventions");
  revalidatePath("/profile");
  revalidatePath("/focus");
  revalidatePath("/admin");
  revalidatePath("/onboarding");
}

export async function completeOnboardingAction(
  _: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const calendarConnected = formData.get("calendarConnected");

  if (calendarConnected !== "true") {
    return {
      error: "Connect Google Calendar before unlocking the workspace.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ONBOARDING_COOKIE_NAME, ONBOARDING_COOKIE_VALUE, {
    httpOnly: true,
    maxAge: ONBOARDING_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
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
