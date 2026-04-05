import Link from "next/link";
import { loadScenario } from "@/app/lib/api";
import { LiveTime } from "@/components/live-time";
import { SectionCard } from "@/components/section-card";
import { StatTile } from "@/components/stat-tile";
import { formatMinutes, formatPercent, formatShortDate } from "@/lib/grind/ui/format";

function HealthGraphic({ value }: { value: number }) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.round(value * 100);
  const dashOffset = circumference * (1 - value);

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(23,23,23,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#healthGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          fill="none"
        />
        <defs>
          <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f4b99" />
            <stop offset="100%" stopColor="#2c7a4b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted">Health</span>
        <span className="mt-1 text-3xl font-semibold tracking-[-0.05em]">{progress}%</span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const snapshot = await loadScenario();
  const highestRiskTask = snapshot.highestRiskTask;
  const learningMode = highestRiskTask ? highestRiskTask.riskProbability < 0.45 : true;
  const upcomingAssignments = snapshot.tasks.slice(0, 3);
  const upcomingClasses = snapshot.scheduleEvents.filter((event) => event.eventCategory === "class").slice(0, 4);

  return (
    <main>
      <section className="relative overflow-hidden rounded-card border border-line bg-surface/95 p-7 shadow-soft">
        <div className="absolute right-[-5rem] top-[-4rem] h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute left-8 top-8 h-20 w-20 rounded-full bg-risk/8 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{learningMode ? "Learning mode" : "Highest risk"}</p>
        {highestRiskTask ? (
          <div className="mt-4 space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">{highestRiskTask.title}</h1>
                <p className="mt-3 text-sm text-muted">
                  {highestRiskTask.subject.toUpperCase()} / due <LiveTime value={highestRiskTask.dueDate} variant="inline" />
                </p>
              </div>
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full border ${
                  learningMode
                    ? "border-safe/20 bg-[radial-gradient(circle_at_30%_30%,rgba(44,122,75,0.18),rgba(255,255,255,0.94))]"
                    : "border-risk/20 bg-[radial-gradient(circle_at_30%_30%,rgba(185,65,46,0.24),rgba(255,255,255,0.94))]"
                }`}
              >
                <span className={`text-3xl font-semibold tracking-[-0.05em] ${learningMode ? "text-safe" : "text-risk"}`}>
                  {formatPercent(highestRiskTask.riskProbability)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <StatTile label="Corrected estimate" value={formatMinutes(highestRiskTask.estimatedEffortMinutesAdjusted)} />
              <StatTile label="Recommended start" value={<LiveTime value={highestRiskTask.recommendedStartTime} semantics="generic" />} />
              <StatTile
                label="Recovery"
                value={
                  snapshot.intervention
                    ? `${formatPercent(snapshot.intervention.successProbabilityBefore)} -> ${formatPercent(snapshot.intervention.successProbabilityAfter)}`
                    : snapshot.story.beforeToAfter
                }
                tone="safe"
              />
            </div>

            <div
              className={`rounded-[2rem] border border-line px-5 py-4 ${
                learningMode
                  ? "bg-[linear-gradient(135deg,rgba(44,122,75,0.05),rgba(255,255,255,0.95))]"
                  : "bg-[linear-gradient(135deg,rgba(185,65,46,0.04),rgba(255,255,255,0.95))]"
              }`}
            >
              <p className="text-sm leading-6 text-muted">{highestRiskTask.explanation}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black"
                href={`/focus?taskId=${highestRiskTask.id}`}
              >
                Start focus session
              </Link>
              <Link className="rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink" href="/tasks">
                View all tasks
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">No active risk detected yet.</p>
            {snapshot.rawEvents.length > 0 ? (
              <div className="rounded-[2rem] border border-line bg-[linear-gradient(135deg,rgba(31,75,153,0.04),rgba(255,255,255,0.95))] px-5 py-4">
                <p className="text-sm leading-6 text-muted">Calendar connected. Grind is pulling your upcoming classes and assignment deadlines so it can build your schedule model.</p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {highestRiskTask || upcomingAssignments.length > 0 || upcomingClasses.length > 0 ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
          <SectionCard title="Week health" eyebrow="Overview">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <HealthGraphic value={snapshot.intervention?.successProbabilityAfter ?? 0.44} />
              <div className="grid flex-1 gap-3 sm:max-w-[18rem]">
                <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,rgba(31,75,153,0.08),rgba(255,255,255,0.82))] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Before</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
                    {snapshot.intervention ? formatPercent(snapshot.intervention.successProbabilityBefore) : snapshot.story.beforeToAfter}
                  </p>
                </div>
                <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,rgba(44,122,75,0.08),rgba(255,255,255,0.82))] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">After</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-safe">
                    {snapshot.intervention ? formatPercent(snapshot.intervention.successProbabilityAfter) : formatPercent(0.44)}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Profile" eyebrow="Signals">
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-[1.6rem] bg-canvas px-4 py-3">
                <span className="text-sm text-muted">Programming multiplier</span>
                <span className="text-lg font-semibold tracking-[-0.04em]">
                  {snapshot.profile.underestimationMultipliers.programming_assignment.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[1.6rem] bg-canvas px-4 py-3">
                <span className="text-sm text-muted">Start delay</span>
                <span className="text-lg font-semibold tracking-[-0.04em]">
                  {(snapshot.profile.meanStartDelayMinutes / 60 / 24).toFixed(1)}d
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[1.6rem] bg-canvas px-4 py-3">
                <span className="text-sm text-muted">Focus window</span>
                <span className="text-lg font-semibold tracking-[-0.04em]">9 PM - 1 AM</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Today" eyebrow="Intervention">
            {snapshot.intervention ? (
              <div className="space-y-3">
                <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,rgba(44,122,75,0.08),rgba(255,255,255,0.82))] px-4 py-4">
                  <p className="text-sm font-semibold tracking-[-0.03em]">{snapshot.intervention.summaryText}</p>
                </div>
                {snapshot.intervention.calendarChanges
                  .filter((change) => change.changeType === "focus_block")
                  .slice(0, 1)
                  .map((change) => (
                    <div key={change.id} className="rounded-[1.8rem] bg-canvas px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted">Focus block</p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.04em]">{change.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {formatShortDate(change.startsAt)} to {formatShortDate(change.endsAt)}
                      </p>
                    </div>
                  ))}
                <Link
                  className="inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink"
                  href="/interventions"
                >
                  Open interventions
                </Link>
              </div>
            ) : learningMode ? (
              <div className="space-y-3">
                <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,rgba(44,122,75,0.08),rgba(255,255,255,0.82))] px-4 py-4">
                  <p className="text-sm font-semibold tracking-[-0.03em]">
                    {highestRiskTask ? "No urgent risk yet. Start working and Grind will learn your timing." : "No urgent risk yet. Your calendar is connected and the next academic events are ready below."}
                  </p>
                </div>
                {highestRiskTask ? (
                  <Link
                    className="inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink"
                    href={`/focus?taskId=${highestRiskTask.id}`}
                  >
                    Start this task
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">No intervention generated yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Upcoming" eyebrow="Calendar">
            <div className="space-y-3">
              {upcomingAssignments.map((task) => (
                <div key={task.id} className="rounded-[1.8rem] bg-canvas px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold tracking-[-0.03em]">{task.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Assignment</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {task.subject.toUpperCase()} / due <LiveTime value={task.dueDate} variant="inline" />
                  </p>
                </div>
              ))}
              {upcomingClasses.map((event) => (
                <div key={event.id} className="rounded-[1.8rem] bg-canvas px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold tracking-[-0.03em]">{event.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Class</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{formatShortDate(event.startsAt)}</p>
                </div>
              ))}
              {upcomingAssignments.length === 0 && upcomingClasses.length === 0 ? (
                <p className="text-sm text-muted">No upcoming academic events found yet.</p>
              ) : null}
            </div>
          </SectionCard>
        </section>
      ) : null}
    </main>
  );
}
