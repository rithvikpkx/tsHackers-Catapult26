import "server-only";

import type { NormalizedTask, Subtask } from "../contracts";
import { env } from "../config/env";
import { generateSubtasks } from "./decompose";

type GeminiSubtaskDraft = {
  title?: unknown;
  instructions?: unknown;
  estimated_minutes?: unknown;
  is_submission_step?: unknown;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiGenerateContentErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
  };
};

const GEMINI_BATCH_SIZE = 3;
const GEMINI_BATCH_DELAY_MS = 1500;
const GEMINI_MAX_RETRY_ATTEMPTS = 3;
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const GEMINI_FALLBACK_MODELS: string[] = [];

function makeSubtask(taskId: string, draft: GeminiSubtaskDraft, index: number, isLast: boolean): Subtask {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function chunkTasks<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseDurationMs(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const match = raw.trim().match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) {
    return null;
  }

  return Math.max(0, Math.ceil(Number.parseFloat(match[1]) * 1000));
}

function parseRetryAfterHeaderMs(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, Number.parseInt(trimmed, 10) * 1000);
  }

  const retryAt = Date.parse(trimmed);
  if (Number.isNaN(retryAt)) {
    return null;
  }

  return Math.max(0, retryAt - Date.now());
}

function extractRetryDelayMs(errorBody: string): number | null {
  try {
    const parsed = JSON.parse(errorBody) as GeminiGenerateContentErrorResponse;
    const retryInfo = parsed.error?.details?.find((detail) => typeof detail.retryDelay === "string");
    return parseDurationMs(retryInfo?.retryDelay);
  } catch {
    return null;
  }
}

function isQuotaExhaustedError(errorBody: string): boolean {
  const normalizedError = errorBody.toLowerCase();
  return normalizedError.includes("\"status\": \"resource_exhausted\"") || normalizedError.includes("quota exceeded");
}

function getGeminiModels(): string[] {
  return [env.geminiModel, ...GEMINI_FALLBACK_MODELS].filter(
    (model, index, models): model is string => Boolean(model) && models.indexOf(model) === index,
  );
}

function makeFallbackSubtasks(tasks: NormalizedTask[]): Map<string, Subtask[]> {
  return new Map(tasks.map((task) => [task.id, generateSubtasks(task)]));
}

function makeSubtasksFromDrafts(task: NormalizedTask, drafts: GeminiSubtaskDraft[]): Subtask[] {
  const subtasks = drafts.slice(0, 8).map((draft, index, arr) => makeSubtask(task.id, draft, index, index === arr.length - 1));

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
}

function buildBatchPrompt(tasks: NormalizedTask[]): string {
  const sections = tasks.map((task) =>
    [
      `Task ID: ${task.id}`,
      `Assignment title: ${task.title}`,
      `Assignment type: ${task.assignmentType}`,
      `Subject: ${task.subject}`,
      `Due date: ${task.dueDate}`,
      `Estimated effort minutes: ${task.estimatedEffortMinutesBase}`,
      `Source description: ${task.rawDescription || "No additional description provided."}`,
    ].join("\n"),
  );

  return [
    "Break each assignment into concrete, execution-ready subtasks for a student.",
    "Avoid generic steps like 'work on assignment' or 'do research'.",
    "Use concrete student-friendly phrasing when helpful.",
    "Keep every plan practical, ordered, and short enough to finish before the deadline.",
    "Return a single JSON object keyed by the exact Task ID values listed below.",
    'Each task key must map to {"subtasks":[{"title":"", "instructions":"", "estimated_minutes":25, "is_submission_step":false}]}',
    "Requirements for every task:",
    "- 4 to 8 subtasks total",
    "- each title must be specific and action-oriented",
    "- each instructions field should say what tangible output the student should produce",
    "- include a final submission/check step when appropriate",
    "",
    sections.join("\n\n"),
  ].join("\n");
}

function buildBatchResponseSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: {
      type: "object",
      properties: {
        subtasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              instructions: { type: "string" },
              estimated_minutes: { type: "number" },
              is_submission_step: { type: "boolean" },
            },
            required: ["title", "instructions", "estimated_minutes", "is_submission_step"],
          },
        },
      },
      required: ["subtasks"],
    },
  };
}

function extractResponseText(payload: GeminiGenerateContentResponse): string | null {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text.length > 0 ? text : null;
}

function parseBatchSubtasks(tasks: NormalizedTask[], content: string): Map<string, Subtask[]> {
  const jsonBlock = extractJsonBlock(content);
  if (!jsonBlock) {
    return new Map();
  }

  try {
    const parsed = JSON.parse(jsonBlock) as unknown;
    if (!isRecord(parsed)) {
      return new Map();
    }

    const subtasksByTaskId = new Map<string, Subtask[]>();

    for (const task of tasks) {
      try {
        const taskEntry = parsed[task.id];
        if (!isRecord(taskEntry) || !Array.isArray(taskEntry.subtasks) || taskEntry.subtasks.length === 0) {
          continue;
        }

        subtasksByTaskId.set(task.id, makeSubtasksFromDrafts(task, taskEntry.subtasks as GeminiSubtaskDraft[]));
      } catch {
        continue;
      }
    }

    return subtasksByTaskId;
  } catch {
    return new Map();
  }
}

function buildGenerateContentUrl(model: string): string {
  const normalizedBase = env.geminiBaseUrl.replace(/\/+$/, "").replace(/\/openai$/, "");
  return `${normalizedBase}/models/${model}:generateContent`;
}

async function requestBatchSubtasks(tasks: NormalizedTask[], attempt: number): Promise<Map<string, Subtask[]> | null> {
  let lastRetryDelayMs: number | null = null;
  let lastStatus: number | null = null;
  let quotaExhaustedAcrossModels = false;

  for (const model of getGeminiModels()) {
    let response: Response;
    try {
      response = await fetch(buildGenerateContentUrl(model), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.geminiApiKey ?? "",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are an academic execution planner. Return only strict JSON with no markdown or commentary.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildBatchPrompt(tasks),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema: buildBatchResponseSchema(),
          },
        }),
        cache: "no-store",
      });
    } catch (error) {
      console.warn("Gemini batch request failed before a response.", {
        model,
        batchSize: tasks.length,
        attempt,
        error,
      });
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const retryDelayMs = extractRetryDelayMs(errorBody) ?? parseRetryAfterHeaderMs(response.headers.get("retry-after"));
      const quotaExhausted = isQuotaExhaustedError(errorBody);

      console.warn("Gemini batch generation failed.", {
        model,
        batchSize: tasks.length,
        attempt,
        status: response.status,
        statusText: response.statusText,
        retryDelayMs,
        quotaExhausted,
        errorBody,
      });

      lastRetryDelayMs = retryDelayMs;
      lastStatus = response.status;
      quotaExhaustedAcrossModels = quotaExhaustedAcrossModels || quotaExhausted;
      continue;
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const content = extractResponseText(payload);

    if (!content) {
      console.warn("Gemini batch generation returned no content.", {
        model,
        batchSize: tasks.length,
        attempt,
      });
      continue;
    }

    return parseBatchSubtasks(tasks, content);
  }

  if (quotaExhaustedAcrossModels) {
    return null;
  }

  if (lastStatus !== null && GEMINI_RETRYABLE_STATUSES.has(lastStatus) && attempt < GEMINI_MAX_RETRY_ATTEMPTS) {
    const fallbackDelay = GEMINI_BATCH_DELAY_MS * 2 ** (attempt - 1);
    await delay(Math.min(lastRetryDelayMs ?? fallbackDelay, 5000));
    return requestBatchSubtasks(tasks, attempt + 1);
  }

  return null;
}

async function recoverMissingTasks(tasks: NormalizedTask[], batchIndex: number): Promise<Map<string, Subtask[]>> {
  const recoveredSubtasks = new Map<string, Subtask[]>();

  for (const [taskIndex, task] of tasks.entries()) {
    try {
      const taskResults = await requestBatchSubtasks([task], 1);
      const recoveredTask = taskResults?.get(task.id);

      if (recoveredTask) {
        recoveredSubtasks.set(task.id, recoveredTask);
      }
    } catch (error) {
      console.error("Gemini single-task recovery failed; falling back.", {
        model: env.geminiModel,
        batchIndex,
        taskId: task.id,
        error,
      });
    }

    if (taskIndex < tasks.length - 1) {
      await delay(GEMINI_BATCH_DELAY_MS);
    }
  }

  return recoveredSubtasks;
}

export async function generateRefinedSubtasksBatched(tasks: NormalizedTask[]): Promise<Map<string, Subtask[]>> {
  if (tasks.length === 0) {
    return new Map();
  }

  if (!env.geminiApiKey) {
    return makeFallbackSubtasks(tasks);
  }

  const subtasksByTaskId = new Map<string, Subtask[]>();
  const batches = chunkTasks(tasks, GEMINI_BATCH_SIZE);

  for (const [batchIndex, batch] of batches.entries()) {
    let batchResults: Map<string, Subtask[]> | null = null;

    try {
      batchResults = await requestBatchSubtasks(batch, 1);
    } catch (error) {
      console.error("Gemini batch generation errored; using heuristic fallback.", {
        model: getGeminiModels(),
        batchSize: batch.length,
        batchIndex,
        error,
      });
    }

    const missingTasks = batch.filter((task) => !batchResults?.has(task.id));
    if (missingTasks.length > 0 && batch.length > 1) {
      const recoveredSubtasks = await recoverMissingTasks(missingTasks, batchIndex);
      batchResults = new Map([...(batchResults?.entries() ?? []), ...recoveredSubtasks.entries()]);
    }

    const fallbackSubtasks = makeFallbackSubtasks(batch);

    for (const task of batch) {
      const parsedSubtasks = batchResults?.get(task.id);
      if (parsedSubtasks) {
        subtasksByTaskId.set(task.id, parsedSubtasks);
        continue;
      }

      console.warn("Gemini returned no valid subtasks for task; using heuristic fallback.", {
        model: getGeminiModels(),
        taskId: task.id,
        batchSize: batch.length,
        batchIndex,
      });
      subtasksByTaskId.set(task.id, fallbackSubtasks.get(task.id) ?? generateSubtasks(task));
    }

    if (batchIndex < batches.length - 1) {
      await delay(GEMINI_BATCH_DELAY_MS);
    }
  }

  return subtasksByTaskId;
}

export async function generateRefinedSubtasks(task: NormalizedTask): Promise<Subtask[]> {
  const subtasksByTaskId = await generateRefinedSubtasksBatched([task]);
  return subtasksByTaskId.get(task.id) ?? generateSubtasks(task);
}
