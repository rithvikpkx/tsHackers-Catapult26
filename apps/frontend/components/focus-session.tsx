"use client";

import { startTransition, useEffect, useState } from "react";
import { completeSubtaskAction, startSubtaskAction } from "@/app/actions";
import { StatTile } from "@/components/stat-tile";
import type { NormalizedTask } from "@/lib/grind/contracts";
import { formatMinutes, formatShortDate } from "@/lib/grind/ui/format";

type FocusSessionProps = {
  task: NormalizedTask;
};

function BoltIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M13 3 6 13h4l-1 8 7-10h-4l1-8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function FocusSession({ task }: FocusSessionProps) {
  const currentStep = task.subtasks.find((subtask) => subtask.status !== "completed");
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!currentStep) {
    return (
      <div className="rounded-[1.8rem] border border-line bg-canvas px-5 py-5">
        <p className="text-lg font-semibold">All steps complete</p>
      </div>
    );
  }

  const progressPercent = Math.round(task.progress.completionRatio * 100);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setAnimatedProgress(progressPercent);
    });
    return () => window.cancelAnimationFrame(id);
  }, [progressPercent]);

  const isActive = currentStep.status === "in_progress";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
      <div className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Focus</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{currentStep.title}</h1>
          </div>
          <div className={`flex h-14 w-14 items-center justify-center rounded-full text-accent ${isActive ? "bg-accent/15 focus-orbit" : "bg-accent/10"}`}>
            <BoltIcon />
          </div>
        </div>

        <div
          className={`mt-5 rounded-[2rem] border border-line bg-[linear-gradient(140deg,rgba(31,75,153,0.06),rgba(44,122,75,0.04))] px-5 py-5 ${
            isActive ? "focus-working-sheen" : ""
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{task.title}</p>
          <p className="mt-3 text-base leading-7 text-muted">{currentStep.instructions}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black disabled:opacity-50"
              disabled={pendingId !== null || currentStep.status !== "pending"}
              onClick={() => {
                setPendingId(currentStep.id);
                startTransition(async () => {
                  await startSubtaskAction(task.id, currentStep.id);
                  setPendingId(null);
                });
              }}
            >
              {isActive ? "In progress" : "Start step"}
            </button>
            <button
              className="rounded-full border border-line bg-white px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink disabled:opacity-50"
              disabled={pendingId !== null || currentStep.status === "completed"}
              onClick={() => {
                setPendingId(currentStep.id);
                startTransition(async () => {
                  await completeSubtaskAction(task.id, currentStep.id);
                  setPendingId(null);
                });
              }}
            >
              Complete step
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Current step" value={`${currentStep.sequence + 1}`} tone="default" size="compact" />
          <StatTile label="Time needed" value={formatMinutes(currentStep.estimatedMinutes)} tone="default" size="compact" />
          <StatTile label="Due" value={formatShortDate(task.dueDate)} tone="risk" size="compact" />
          <StatTile label="Progress" value={`${progressPercent}%`} tone="safe" size="compact" />
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-4xl font-semibold tracking-[-0.06em]">Queue</h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
            {task.progress.completedSubtasks}/{task.progress.totalSubtasks}
          </span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#1f4b99,#2c7a4b)] transition-[width] duration-700 ease-out"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>

        <div className="mt-5 space-y-2.5">
          {task.subtasks.map((subtask) => {
            const statusTone =
              subtask.status === "completed"
                ? "bg-safe/10 text-safe"
                : subtask.status === "in_progress"
                  ? "bg-accent/10 text-accent"
                  : "bg-canvas text-muted";
            const isWorking = subtask.status === "in_progress";

            return (
              <div
                key={subtask.id}
                className={`rounded-[1.6rem] border px-4 py-3 transition ${
                  subtask.id === currentStep.id
                    ? `border-accent/35 bg-[linear-gradient(140deg,rgba(31,75,153,0.05),rgba(255,255,255,0.95))] ${isWorking ? "focus-working-sheen" : ""}`
                    : "border-line bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${statusTone}`}>
                    {isWorking ? <span className="absolute inset-0 rounded-full border border-accent/30 animate-ping" /> : null}
                    {subtask.status === "completed" ? "✓" : subtask.sequence + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {subtask.title}
                      {isWorking ? <span className="ml-2 inline-block h-2 w-2 rounded-full bg-accent working-dot" /> : null}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">{formatMinutes(subtask.estimatedMinutes)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent/35 hover:text-ink disabled:opacity-40"
                      disabled={pendingId !== null || subtask.status !== "pending"}
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
                      className="rounded-full bg-ink px-3 py-1.5 text-xs text-white transition hover:bg-black disabled:opacity-40"
                      disabled={pendingId !== null || subtask.status === "completed"}
                      onClick={() => {
                        setPendingId(subtask.id);
                        startTransition(async () => {
                          await completeSubtaskAction(task.id, subtask.id);
                          setPendingId(null);
                        });
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
