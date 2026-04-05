"use client";

import { startTransition, useState } from "react";
import { deleteTaskAction } from "@/app/actions";

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M9 4.75h6m-9 3h12m-1 0-.55 9.05A2 2 0 0 1 14.45 18.75h-4.9a2 2 0 0 1-1.99-1.95L7 7.75m3 3.25v4.5m4-4.5v4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-risk/18 bg-[linear-gradient(180deg,rgba(185,65,46,0.08),rgba(255,255,255,0.94))] px-4 py-2 text-sm text-risk transition hover:border-risk/32 hover:bg-[linear-gradient(180deg,rgba(185,65,46,0.12),rgba(255,255,255,0.98))] disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        setPending(true);
        startTransition(async () => {
          await deleteTaskAction(taskId);
          setPending(false);
        });
      }}
      type="button"
    >
      <TrashIcon />
      {pending ? "Removing..." : "Delete"}
    </button>
  );
}
