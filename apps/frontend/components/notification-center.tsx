"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceCallActions } from "@/components/voice-call-actions";
import type { NotificationPayload, VoiceCallScript } from "@/lib/grind/contracts";

type NotificationCenterProps = {
  notifications: NotificationPayload[];
  voiceCall?: VoiceCallScript;
};

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M12 4a4 4 0 0 0-4 4v1.7c0 .7-.2 1.4-.6 2l-1.1 1.8a1.6 1.6 0 0 0 1.4 2.5h8.6a1.6 1.6 0 0 0 1.4-2.5l-1.1-1.8c-.4-.6-.6-1.3-.6-2V8a4 4 0 0 0-4-4Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 18a2.1 2.1 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M12 4a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 1 1-5 0v-5A2.5 2.5 0 0 1 12 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M7.5 11.5a4.5 4.5 0 0 0 9 0M12 16v4M9 20h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m5 8 7 5 7-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function NotificationCenter({ notifications, voiceCall }: NotificationCenterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deliveryById, setDeliveryById] = useState<Record<string, NotificationPayload["deliveryStatus"]>>({});
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string | undefined>>({});
  const count = notifications.length + (voiceCall ? 1 : 0);

  useEffect(() => {
    setDeliveryById({});
    setSendingIds({});
    setErrorById({});
  }, [notifications]);

  const grouped = useMemo(
    () => ({
      voice: voiceCall ? [voiceCall] : [],
      outbox: notifications,
    }),
    [notifications, voiceCall],
  );

  async function sendEmailNotification(notification: NotificationPayload) {
    if (notification.channel !== "email") {
      return;
    }

    setSendingIds((current) => ({ ...current, [notification.id]: true }));
    setErrorById((current) => ({ ...current, [notification.id]: undefined }));

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: notification.id,
          notification,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        deliveryStatus?: NotificationPayload["deliveryStatus"];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send email notification.");
      }

      setDeliveryById((current) => ({
        ...current,
        [notification.id]: payload.deliveryStatus ?? "sent",
      }));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send email notification.";
      setErrorById((current) => ({ ...current, [notification.id]: message }));
    } finally {
      setSendingIds((current) => ({ ...current, [notification.id]: false }));
    }
  }

  function statusLabel(status: NotificationPayload["deliveryStatus"]): string {
    if (status === "sent") {
      return "sent";
    }
    if (status === "simulated") {
      return "simulated";
    }
    return "queued";
  }

  return (
    <div className="relative z-[140]">
      <button
        aria-expanded={open}
        aria-label="Notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-accent/35 hover:bg-canvas hover:text-ink"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-[150] bg-[rgba(248,244,237,0.56)]"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-14 z-[170] w-[min(30rem,calc(100vw-2.5rem))] overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(255,252,247,0.96)] p-4 shadow-[0_36px_120px_rgba(23,23,23,0.24)] ring-1 ring-black/5 backdrop-blur-3xl backdrop-saturate-150">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.2))]" />
            <div className="relative flex items-center justify-between gap-3 px-1 pb-3">
              <h2 className="text-lg font-semibold tracking-[-0.04em]">Notifications</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-muted">{count} active</span>
            </div>

            <div className="relative space-y-3">
              {grouped.voice.length > 0 ? (
                <div className="rounded-[1.8rem] border border-line/90 bg-[rgba(255,255,255,0.84)] px-4 py-4 shadow-[0_12px_34px_rgba(23,23,23,0.06)]">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <VoiceIcon />
                    </span>
                    Voice reminder
                  </div>
                  <div className="mt-3 rounded-[1.5rem] bg-canvas px-4 py-3 text-sm leading-6 text-muted">
                    <p>{voiceCall?.riskLine}</p>
                    <p className="mt-2">{voiceCall?.actionLine}</p>
                  </div>
                  {voiceCall ? <div className="mt-3"><VoiceCallActions call={voiceCall} /></div> : null}
                </div>
              ) : null}

              {grouped.outbox.length > 0 ? (
                <div className="rounded-[1.8rem] border border-line/90 bg-[rgba(255,255,255,0.84)] px-4 py-4 shadow-[0_12px_34px_rgba(23,23,23,0.06)]">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-safe/10 text-safe">
                      <MailIcon />
                    </span>
                    Outbox
                  </div>
                  <div className="mt-3 space-y-2">
                    {grouped.outbox.map((notification) => (
                      <div key={notification.id} className="rounded-[1.4rem] bg-canvas px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{notification.subject}</p>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-muted">{notification.channel}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
                            {statusLabel(deliveryById[notification.id] ?? notification.deliveryStatus)}
                          </span>
                          {notification.channel === "email" ? (
                            <button
                              type="button"
                              onClick={() => sendEmailNotification(notification)}
                              disabled={Boolean(sendingIds[notification.id])}
                              className="rounded-full border border-line bg-white px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-ink transition hover:border-accent/35 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {sendingIds[notification.id] ? "Sending..." : "Send now"}
                            </button>
                          ) : null}
                        </div>
                        {errorById[notification.id] ? (
                          <p className="mt-2 text-xs text-risk">{errorById[notification.id]}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
