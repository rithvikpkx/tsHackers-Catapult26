import type { IntegrationStatus } from "../contracts";

function hasEnv(key: string): boolean {
  const value = process.env[key];
  return Boolean(value && value.trim().length > 0);
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  demoMode: process.env.DEMO_MODE !== "false",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  voiceProvider: process.env.VOICE_PROVIDER,
  voiceWebhookSecret: process.env.VOICE_WEBHOOK_SECRET,
};

export function getIntegrationStatus(): IntegrationStatus {
  return {
    googleCalendar: hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET") ? "ready" : "demo",
    supabase: hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "ready" : "demo",
    resend: hasEnv("RESEND_API_KEY") ? "ready" : "demo",
    voice: hasEnv("VOICE_PROVIDER") ? "ready" : "demo",
  };
}
