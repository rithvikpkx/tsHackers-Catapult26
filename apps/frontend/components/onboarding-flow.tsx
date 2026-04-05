"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeOnboardingAction, type OnboardingActionState } from "@/app/actions";
import { SectionCard } from "@/components/section-card";
import { StatTile } from "@/components/stat-tile";

const initialState: OnboardingActionState = {};

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M7 3v3M17 3v3M4 9h16M6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10M7.2 10h9.6A1.2 1.2 0 0 1 18 11.2v7.6a1.2 1.2 0 0 1-1.2 1.2H7.2A1.2 1.2 0 0 1 6 18.8v-7.6A1.2 1.2 0 0 1 7.2 10Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
      <path
        d="m5 10 3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function StepItem({
  step,
  title,
  detail,
  complete,
}: {
  step: string;
  title: string;
  detail: string;
  complete: boolean;
}) {
  return (
    <div className="flex gap-4 rounded-[1.7rem] bg-white/75 px-4 py-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
          complete ? "border-safe/25 bg-safe/10 text-safe" : "border-line bg-canvas text-muted"
        }`}
      >
        {complete ? <CheckIcon /> : step}
      </div>
      <div>
        <p className="text-sm font-semibold tracking-[-0.02em] text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
      </div>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full rounded-full bg-ink px-4 py-3 text-sm text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Unlocking workspace..." : "Complete onboarding"}
    </button>
  );
}

export function OnboardingFlow() {
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [state, formAction] = useActionState(completeOnboardingAction, initialState);

  const isReadyToSubmit = isCalendarConnected;
  const statusCards = useMemo(
    () => [
      {
        label: "Calendar",
        tone: isCalendarConnected ? "safe" : "default",
        value: isCalendarConnected ? "Linked" : "Required",
      },
      {
        label: "Route gate",
        tone: isReadyToSubmit ? "safe" : "risk",
        value: isReadyToSubmit ? "Clears" : "Active",
      },
      {
        label: "App access",
        tone: isReadyToSubmit ? "safe" : "risk",
        value: isReadyToSubmit ? "Ready" : "Locked",
      },
    ] as const,
    [isCalendarConnected, isReadyToSubmit],
  );
  const unlockPreview = useMemo(
    () => [
      {
        title: "Pulse",
        detail: "See the highest-risk assignment first with the same hero treatment used across the main dashboard.",
      },
      {
        title: "Focus",
        detail: "Turn tasks into step-by-step focus sessions once onboarding clears the access gate.",
      },
      {
        title: "Interventions",
        detail: "Open schedule repair and recovery suggestions after the setup cookie is written.",
      },
    ],
    [],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="relative overflow-hidden rounded-card border border-line bg-surface/95 p-7 shadow-soft">
        <div className="absolute right-[-5rem] top-[-4rem] h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute left-10 top-10 h-20 w-20 rounded-full bg-risk/8 blur-2xl" />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Mandatory onboarding</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
              Connect calendar before Grind opens the workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Grind&apos;s interface uses large hero surfaces, soft gradients, and calm, high-signal cards. The onboarding flow now only asks for the single integration this branch actually supports.
            </p>
          </div>

          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-accent/20 bg-[radial-gradient(circle_at_30%_30%,rgba(31,75,153,0.2),rgba(255,255,255,0.94))] text-accent shadow-[0_18px_40px_rgba(31,75,153,0.12)]">
            <LockIcon />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {statusCards.map((card) => (
            <StatTile key={card.label} label={card.label} tone={card.tone} value={card.value} size="compact" />
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[2rem] border border-line bg-[linear-gradient(135deg,rgba(31,75,153,0.05),rgba(255,255,255,0.96))] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">What unlocks next</p>
            <div className="mt-4 space-y-3">
              {unlockPreview.map((item, index) => (
                <div key={item.title} className="rounded-[1.6rem] border border-white/70 bg-white/80 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold tracking-[-0.03em] text-ink">{item.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted">0{index + 1}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-line bg-[linear-gradient(135deg,rgba(44,122,75,0.05),rgba(255,255,255,0.96))] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Setup sequence</p>
            <div className="mt-4 space-y-3">
              <StepItem
                complete={isCalendarConnected}
                detail="Simulate the Google Calendar connection so scheduling surfaces can be enabled."
                step="01"
                title="Connect calendar"
              />
              <StepItem
                complete={isReadyToSubmit}
                detail="Write the onboarding cookie, unlock protected routes, and redirect to the dashboard."
                step="02"
                title="Unlock workspace"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <SectionCard title="Unlock Grind" eyebrow="Required setup">
          <div className="space-y-4">
            <div className="rounded-[1.8rem] border border-line bg-canvas px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Step 1</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Connect Google Calendar</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Use the same rounded action treatment from the rest of the app. This remains a simulated connect step, but it is still required before the workspace unlocks.
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    isCalendarConnected ? "bg-safe/12 text-safe" : "bg-accent/12 text-accent"
                  }`}
                >
                  {isCalendarConnected ? <CheckIcon /> : <CalendarIcon />}
                </span>
              </div>

              {isCalendarConnected ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.5rem] bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Google Calendar linked for onboarding.</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">Scheduling surfaces can now be enabled</p>
                  </div>
                  <span className="rounded-full bg-safe/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-safe">Connected</span>
                </div>
              ) : (
                <button
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm text-white transition hover:bg-[#183d7f]"
                  onClick={() => setIsCalendarConnected(true)}
                  type="button"
                >
                  Connect Google Calendar
                </button>
              )}
            </div>

            <form action={formAction} className="space-y-4">
              <input name="calendarConnected" type="hidden" value={isCalendarConnected ? "true" : "false"} />

              <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-line bg-white px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Access gate</p>
                  <p className="mt-1 text-sm text-muted">The dashboard stays blocked until the calendar connection step is complete.</p>
                </div>
                <span
                  className={`rounded-full px-3 py-2 text-xs uppercase tracking-[0.16em] ${
                    isReadyToSubmit ? "bg-safe/10 text-safe" : "bg-canvas text-muted"
                  }`}
                >
                  {isReadyToSubmit ? "Ready to unlock" : "Locked"}
                </span>
              </div>

              {state.error ? (
                <div className="rounded-[1.4rem] border border-risk/20 bg-[linear-gradient(180deg,rgba(185,65,46,0.08),rgba(255,255,255,0.88))] px-4 py-3 text-sm text-risk">
                  {state.error}
                </div>
              ) : null}

              <SubmitButton disabled={!isReadyToSubmit} />
            </form>
          </div>
        </SectionCard>

        <SectionCard title="After Unlock" eyebrow="Preview">
          <div className="space-y-3">
            <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,rgba(31,75,153,0.08),rgba(255,255,255,0.82))] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Pulse surface</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">
                Highest-risk work, corrected estimates, and recovery windows all open once onboarding clears.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.6rem] bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Tasks</p>
                <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-ink">Queue and drill-downs</p>
              </div>
              <div className="rounded-[1.6rem] bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Focus</p>
                <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-ink">Step-by-step execution</p>
              </div>
              <div className="rounded-[1.6rem] bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Profile</p>
                <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-ink">Signals and distortions</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
