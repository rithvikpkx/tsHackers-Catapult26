import "server-only";

import type { NormalizedTask, Subtask } from "../contracts";
import { env } from "../config/env";
import { generateSubtasks } from "./decompose";

type PurdueChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type PurdueSubtaskDraft = {
  title?: unknown;
  instructions?: unknown;
  estimated_minutes?: unknown;
  is_submission_step?: unknown;
};

function makeSubtask(taskId: string, draft: PurdueSubtaskDraft, index: number, isLast: boolean): Subtask {
  const title =
    typeof draft.title === "string" && draft.title.trim().length > 0 ? draft.title.trim() : `Step ${index + 1}`;
  const instructions =
    typeof draft.instructions === "string" && draft.instructions.trim().length > 0
      ? draft.instructions.trim()
      : "Complete this step directly against the assignment requirements.";
  const estimatedMinutes =
    typeof draft.estimated_minutes === "number" && Number.isFinite(draft.estimated_minutes)
      ? Math.max(5, Math.min(240, Math.round(draft.estimated_minutes)))
      : 25;
  const isSubmissionStep = typeof draft.is_submission_step === "boolean" ? draft.is_submission_step : isLast;

  return {
    id: `${taskId}-step-${index + 1}`,
    taskId,
    title,
    instructions,
    sequence: index,
    estimatedMinutes,
    status: "pending",
    isSubmissionStep,
    sourceMode: "llm",
  };
}

function extractJsonBlock(content: string): string | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

function parseSubtasks(task: NormalizedTask, content: string): Subtask[] | null {
  const jsonBlock = extractJsonBlock(content);
  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock) as { subtasks?: PurdueSubtaskDraft[] };
    if (!Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) {
      return null;
    }

    const subtasks = parsed.subtasks
      .slice(0, 8)
      .map((draft, index, arr) => makeSubtask(task.id, draft, index, index === arr.length - 1));

    if (!subtasks.some((subtask) => subtask.isSubmissionStep)) {
      subtasks.push({
        id: `${task.id}-step-${subtasks.length + 1}`,
        taskId: task.id,
        title: "Submit assignment",
        instructions: "Upload the final deliverable and verify the submission timestamp or confirmation.",
        sequence: subtasks.length,
        estimatedMinutes: 10,
        status: "pending",
        isSubmissionStep: true,
        sourceMode: "llm",
      });
    }

    return subtasks;
  } catch {
    return null;
  }
}

function buildPrompt(task: NormalizedTask): string {
  return [
    "Break this assignment into concrete, execution-ready subtasks for a student.",
    "Avoid generic steps like 'work on assignment' or 'do research'.",
    "Use specific Purdue-student phrasing when helpful.",
    "Keep the plan practical, ordered, and short enough to finish before the deadline.",
    "Return JSON only with this exact shape:",
    '{"subtasks":[{"title":"", "instructions":"", "estimated_minutes":25, "is_submission_step":false}]}',
    "Requirements:",
    "- 4 to 8 subtasks total",
    "- each title must be specific and action-oriented",
    "- each instructions field should say what tangible output the student should produce",
    "- include a final submission/check step when appropriate",
    `Assignment title: ${task.title}`,
    `Assignment type: ${task.assignmentType}`,
    `Subject: ${task.subject}`,
    `Due date: ${task.dueDate}`,
    `Estimated effort minutes: ${task.estimatedEffortMinutesBase}`,
    `Source description: ${task.rawDescription || "No additional description provided."}`,
  ].join("\n");
}

export async function generateRefinedSubtasks(task: NormalizedTask): Promise<Subtask[]> {
  if (!env.purdueGenAiApiKey) {
    return generateSubtasks(task);
  }

  const response = await fetch(`${env.purdueGenAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.purdueGenAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.purdueGenAiModel,
      stream: false,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an academic execution planner. Return only strict JSON. Do not include markdown or commentary.",
        },
        {
          role: "user",
          content: buildPrompt(task),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return generateSubtasks(task);
  }

  const payload = (await response.json()) as PurdueChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return generateSubtasks(task);
  }

  return parseSubtasks(task, content) ?? generateSubtasks(task);
}
