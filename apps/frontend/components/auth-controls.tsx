"use client";

import { signIn, signOut } from "next-auth/react";

type AuthControlsProps = {
  email?: string | null;
};

export function AuthControls({ email }: AuthControlsProps) {
  if (!email) {
    return (
      <button
        className="rounded-full bg-ink px-4 py-2 text-sm text-white transition hover:bg-black"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        type="button"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted sm:inline">{email}</span>
      <button
        className="rounded-full border border-line bg-white px-4 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
