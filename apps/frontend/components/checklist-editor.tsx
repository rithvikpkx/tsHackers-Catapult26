"use client";

import { startTransition, useState } from "react";
import { completeSubtaskAction, renameSubtaskAction, startSubtaskAction } from "@/app/actions";
import type { NormalizedTask } from "@/lib/grind/contracts";
import { formatMinutes } from "@/lib/grind/ui/format";

export function ChecklistEditor({ task }: { task: NormalizedTask }) {
  const [titles, setTitles] = useState<Record<string, string>>(
    Object.fromEntries(task.subtasks.map((subtask) => [subtask.id, subtask.title])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {task.subtasks.map((subtask) => {
        const isPending = pendingId === subtask.id;
        return (
          <div key={subtask.id} className="rounded-3xl border border-line bg-white/90 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
                  <span>Step {subtask.sequence + 1}</span>
                  <span>{formatMinutes(subtask.estimatedMinutes)}</span>
                  <span>{subtask.status.replace("_", " ")}</span>
                </div>
                <input
                  className="mt-2 w-full rounded-2xl border border-line bg-canvas px-3 py-2 text-base font-semibold tracking-[-0.02em] outline-none transition focus:border-accent/40"
                  value={titles[subtask.id] ?? subtask.title}
                  onChange={(event) =>
                    setTitles((current) => ({
                      ...current,
                      [subtask.id]: event.target.value,
                    }))
                  }
                />
                <p className="mt-2 text-sm leading-6 text-muted">{subtask.instructions}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  className="rounded-full border border-line px-3 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink disabled:opacity-50"
                  disabled={isPending || titles[subtask.id] === subtask.title}
                  onClick={() => {
                    setPendingId(subtask.id);
                    startTransition(async () => {
                      await renameSubtaskAction(task.id, subtask.id, titles[subtask.id] ?? subtask.title);
                      setPendingId(null);
                    });
                  }}
                >
                  Save
                </button>
                <button
                  className="rounded-full border border-line px-3 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink disabled:opacity-50"
                  disabled={isPending || subtask.status !== "pending"}
                  onClick={() => {
                    setPendingId(subtask.id);
                    startTransition(async () => {
                      await startSubtaskAction(task.id, subtask.id);
                      setPendingId(null);
                    });
                  }}
                >
                  Start
                </button>
                <button
                  className="rounded-full bg-ink px-3 py-2 text-sm text-white transition hover:bg-black disabled:opacity-50"
                  disabled={isPending || subtask.status === "completed"}
                  onClick={() => {
                    setPendingId(subtask.id);
                    startTransition(async () => {
                      await completeSubtaskAction(task.id, subtask.id);
                      setPendingId(null);
                    });
                  }}
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
