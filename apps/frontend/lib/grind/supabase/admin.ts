import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/grind/config/env";

type UntypedSupabaseClient = SupabaseClient<any, "public", any>;

let adminClient: UntypedSupabaseClient | null = null;

export function getSupabaseAdminClient(): UntypedSupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase environment is incomplete.");
  }

  if (!adminClient) {
    adminClient = createClient<any>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
