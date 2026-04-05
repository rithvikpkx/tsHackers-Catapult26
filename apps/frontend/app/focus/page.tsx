import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";
import { formatMinutes, formatShortDate } from "@/lib/grind/ui/format";

export default async function FocusPage() {
  const snapshot = await loadScenario();
  const task = snapshot.highestRiskTask ?? snapshot.tasks[0];
  const currentStep = task?.subtasks.find((subtask) => subtask.status !== "completed");

  return (
    <main className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
      <SectionCard title="Focus mode" eyebrow="Single-thread the next concrete action">
        {task && currentStep ? (
          <div className="space-y-5">
            <div className="rounded-card border border-line bg-canvas px-5 py-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Current task</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{task.title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">{currentStep.instructions}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Current step</p>
                <p className="mt-1 text-base font-semibold">{currentStep.title}</p>
              </div>
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Time needed</p>
                <p className="mt-1 text-base font-semibold">{formatMinutes(currentStep.estimatedMinutes)}</p>
              </div>
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Due</p>
                <p className="mt-1 text-base font-semibold">{formatShortDate(task.dueDate)}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No focus step is available.</p>
        )}
      </SectionCard>

      <SectionCard title="Why this step" eyebrow="Momentum strategy">
        {task && currentStep ? (
          <div className="space-y-3 text-sm leading-6 text-muted">
            <p>Grind always starts with the smallest irreversible step that creates forward motion.</p>
            <p>Once this step begins, the task’s actual start time is captured for the distortion profile.</p>
            <p>When the final submission step completes, Grind records the submission window for future calibration.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">No active step.</p>
        )}
      </SectionCard>
    </main>
  );
}
