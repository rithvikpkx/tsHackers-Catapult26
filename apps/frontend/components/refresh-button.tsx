"use client";

import { startTransition, useState } from "react";
import { rerunDemoPipelineAction, syncGoogleCalendarAction } from "@/app/actions";

export function RefreshButton({ mode }: { mode: "demo" | "live" }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        setPending(true);
        startTransition(async () => {
          if (mode === "demo") {
            await rerunDemoPipelineAction();
          } else {
            await syncGoogleCalendarAction();
          }
          setPending(false);
        });
      }}
    >
      {pending ? (mode === "demo" ? "Refreshing..." : "Syncing...") : mode === "demo" ? "Re-run demo pipeline" : "Sync Google Calendar"}
    </button>
  );
}
