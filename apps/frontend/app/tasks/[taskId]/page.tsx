import { notFound } from "next/navigation";
import { ChecklistEditor } from "@/components/checklist-editor";
import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";
import { formatMinutes, formatPercent, formatShortDate } from "@/lib/grind/ui/format";

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const snapshot = await loadScenario();
  const task = snapshot.tasks.find((entry) => entry.id === taskId);

  if (!task) {
    notFound();
  }

  const risk = snapshot.risks.find((entry) => entry.taskId === task.id);

  return (
    <main className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
      <SectionCard title={task.title} eyebrow={`${task.subject.toUpperCase()} · ${task.assignmentType.replaceAll("_", " ")}`}>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-3xl bg-canvas px-4 py-3">
              <p className="text-sm text-muted">Due</p>
              <p className="mt-1 text-base font-semibold">{formatShortDate(task.dueDate)}</p>
            </div>
            <div className="rounded-3xl bg-canvas px-4 py-3">
              <p className="text-sm text-muted">Risk</p>
              <p className="mt-1 text-base font-semibold text-risk">{formatPercent(task.riskProbability)}</p>
            </div>
            <div className="rounded-3xl bg-canvas px-4 py-3">
              <p className="text-sm text-muted">Corrected estimate</p>
              <p className="mt-1 text-base font-semibold">{formatMinutes(task.estimatedEffortMinutesAdjusted)}</p>
            </div>
            <div className="rounded-3xl bg-canvas px-4 py-3">
              <p className="text-sm text-muted">Status</p>
              <p className="mt-1 text-base font-semibold capitalize">{task.taskStatus.replace("_", " ")}</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-muted">{task.explanation}</p>
          <ChecklistEditor task={task} />
        </div>
      </SectionCard>

      <div className="space-y-5">
        <SectionCard title="Prediction" eyebrow="Risk model">
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted">{risk?.explanation}</p>
            <div className="rounded-3xl bg-canvas px-4 py-3">
              <p className="text-sm text-muted">Available before due</p>
              <p className="mt-1 text-xl font-semibold">{formatMinutes(risk?.availableMinutesBeforeDue ?? 0)}</p>
            </div>
            <div className="rounded-3xl bg-canvas px-4 py-3">
              <p className="text-sm text-muted">Predicted required</p>
              <p className="mt-1 text-xl font-semibold">{formatMinutes(risk?.predictedRequiredMinutes ?? 0)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Intervention context" eyebrow="Schedule effect">
          {snapshot.intervention?.taskId === task.id ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted">{snapshot.intervention.summaryText}</p>
              {snapshot.intervention.calendarChanges.map((change) => (
                <div key={change.id} className="rounded-3xl border border-line bg-white px-4 py-3">
                  <p className="font-semibold">{change.title}</p>
                  <p className="mt-1 text-sm text-muted">{change.detail}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatShortDate(change.startsAt)} to {formatShortDate(change.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No intervention has been generated for this task.</p>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
