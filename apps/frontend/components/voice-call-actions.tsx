"use client";

import { startTransition, useState } from "react";
import { respondToVoiceCallAction } from "@/app/actions";
import type { VoiceCallScript } from "@/lib/grind/contracts";

export function VoiceCallActions({ call }: { call: VoiceCallScript }) {
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {call.choices.map((choice) => (
        <button
          key={choice.intent}
          className="rounded-full border border-line bg-white px-3 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink disabled:opacity-50"
          disabled={pendingIntent !== null}
          onClick={() => {
            setPendingIntent(choice.intent);
            startTransition(async () => {
              await respondToVoiceCallAction(call.id, choice.intent);
              setPendingIntent(null);
            });
          }}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
