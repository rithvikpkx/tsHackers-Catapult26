"use client";

import { startTransition, useState } from "react";
import { rerunDemoPipelineAction } from "@/app/actions";

export function RefreshButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        setPending(true);
        startTransition(async () => {
          await rerunDemoPipelineAction();
          setPending(false);
        });
      }}
    >
      {pending ? "Refreshing..." : "Re-run demo pipeline"}
    </button>
  );
}
