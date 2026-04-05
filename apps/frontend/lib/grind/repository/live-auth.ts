import "server-only";

import { getSupabaseAdminClient } from "@/lib/grind/supabase/admin";

type SyncGoogleAccountArgs = {
  email: string;
  fullName?: string;
  googleAccountId?: string;
  scope?: string | null;
  refreshToken?: string | null;
};

type AppUserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  google_account_id: string | null;
};

export async function syncGoogleAccountToDatabase(args: SyncGoogleAccountArgs): Promise<{ id: string; email: string }> {
  const supabase = getSupabaseAdminClient();

  const userPayload = {
    email: args.email,
    full_name: args.fullName ?? null,
    google_account_id: args.googleAccountId ?? null,
  };

  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(userPayload, { onConflict: "email" })
    .select("id,email,full_name,google_account_id")
    .single<AppUserRecord>();

  if (userError || !user) {
    throw new Error(`Unable to persist user: ${userError?.message ?? "unknown error"}`);
  }

  const { data: existingConnection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")
    .maybeSingle<{ id: string }>();

  const scope = args.scope ?? "";
  const connectionPayload = {
    user_id: user.id,
    provider: "google_calendar",
    provider_account_id: args.googleAccountId ?? null,
    access_scope_read: scope.includes("calendar"),
    access_scope_write: scope.includes("calendar.events") || scope.includes("https://www.googleapis.com/auth/calendar"),
    status: "connected",
    encrypted_refresh_token: args.refreshToken ?? null,
  };

  if (existingConnection?.id) {
    await supabase.from("calendar_connections").update(connectionPayload).eq("id", existingConnection.id);
  } else {
    await supabase.from("calendar_connections").insert(connectionPayload);
  }

  return { id: user.id, email: user.email };
}
