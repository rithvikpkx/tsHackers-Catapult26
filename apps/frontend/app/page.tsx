import Link from "next/link";
import { VoiceCallActions } from "@/components/voice-call-actions";
import { SectionCard } from "@/components/section-card";
import { loadScenario } from "@/app/lib/api";
import { formatMinutes, formatPercent, formatShortDate } from "@/lib/grind/ui/format";

export default async function HomePage() {
  const snapshot = await loadScenario();
  const highestRiskTask = snapshot.highestRiskTask;

  return (
    <main className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <section className="rounded-card border border-line bg-surface/95 p-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Pulse board</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-ink sm:text-5xl">
            {snapshot.story.headline}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Grind translated your calendar into concrete work, measured how you usually distort assignments, and prepared a cleaner recovery path.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black" href="/focus">
              Start first step
            </Link>
            <Link className="rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink" href="/tasks">
              Open task breakdown
            </Link>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="High-risk task" eyebrow="Detected risk" accent="risk">
            {highestRiskTask ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{highestRiskTask.title}</p>
                    <p className="text-sm text-muted">
                      {highestRiskTask.subject.toUpperCase()} · due {formatShortDate(highestRiskTask.dueDate)}
                    </p>
                  </div>
                  <p className="text-3xl font-semibold text-risk">{formatPercent(highestRiskTask.riskProbability)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-muted">
                  <div className="rounded-3xl bg-canvas px-4 py-3">
                    <p>Corrected estimate</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{formatMinutes(highestRiskTask.estimatedEffortMinutesAdjusted)}</p>
                  </div>
                  <div className="rounded-3xl bg-canvas px-4 py-3">
                    <p>Recommended start</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{formatShortDate(highestRiskTask.recommendedStartTime)}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted">{highestRiskTask.explanation}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">No active risk detected.</p>
            )}
          </SectionCard>

          <SectionCard title="Distortion profile" eyebrow="Behavior model">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Programming multiplier</p>
                <p className="mt-1 text-xl font-semibold">{snapshot.profile.underestimationMultipliers.programming_assignment.toFixed(1)}x</p>
              </div>
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Average start delay</p>
                <p className="mt-1 text-xl font-semibold">{(snapshot.profile.meanStartDelayMinutes / 60 / 24).toFixed(1)}d</p>
              </div>
              <div className="rounded-3xl bg-canvas px-4 py-3">
                <p className="text-sm text-muted">Best focus window</p>
                <p className="mt-1 text-xl font-semibold">9 PM - 1 AM</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="What changed today" eyebrow="Intervention" accent="safe">
            {snapshot.intervention ? (
              <div className="space-y-3">
                <p className="text-lg font-semibold">{snapshot.intervention.summaryText}</p>
                <p className="text-sm leading-6 text-muted">{snapshot.intervention.rationaleText}</p>
                <div className="rounded-3xl bg-canvas px-4 py-3">
                  <p className="text-sm text-muted">Success probability</p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatPercent(snapshot.intervention.successProbabilityBefore)} to{" "}
                    {formatPercent(snapshot.intervention.successProbabilityAfter)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No intervention generated yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Upcoming focus block" eyebrow="Next action">
            {snapshot.intervention ? (
              <div className="space-y-3">
                {snapshot.intervention.calendarChanges
                  .filter((change) => change.changeType === "focus_block")
                  .map((change) => (
                    <div key={change.id} className="rounded-3xl bg-canvas px-4 py-3">
                      <p className="text-lg font-semibold">{change.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {formatShortDate(change.startsAt)} to {formatShortDate(change.endsAt)}
                      </p>
                    </div>
                  ))}
                <Link className="inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink" href="/focus">
                  Enter focus mode
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">No focus block reserved yet.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="space-y-5">
        <SectionCard title="Week health" eyebrow="Pulse signal">
          <div className="rounded-3xl bg-canvas px-4 py-4">
            <p className="text-sm text-muted">Current state</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{snapshot.story.beforeToAfter}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              The week is recoverable because Grind found one clear bottleneck and one concrete change that materially improves the odds.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Voice reminder" eyebrow="Urgent outreach">
          {snapshot.voiceCall ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted">{snapshot.voiceCall.opening}</p>
              <p className="rounded-3xl bg-canvas px-4 py-3 text-sm text-muted">{snapshot.voiceCall.riskLine}</p>
              <p className="text-sm leading-6 text-muted">{snapshot.voiceCall.actionLine}</p>
              <VoiceCallActions call={snapshot.voiceCall} />
              {snapshot.voiceCall.userResponse ? (
                <p className="text-sm text-safe">Latest response: {snapshot.voiceCall.userResponse.replaceAll("_", " ")}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">No call queued.</p>
          )}
        </SectionCard>

        <SectionCard title="Notification outbox" eyebrow="Email + voice">
          <div className="space-y-3">
            {snapshot.notifications.map((notification) => (
              <div key={notification.id} className="rounded-3xl border border-line bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{notification.subject}</p>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">{notification.channel}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{notification.preview}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
