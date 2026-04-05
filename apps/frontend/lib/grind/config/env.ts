import type { IntegrationStatus } from "../contracts";

function hasEnv(key: string): boolean {
  const value = process.env[key];
  return Boolean(value && value.trim().length > 0);
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  appMode: process.env.APP_MODE ?? "demo",
  demoMode: process.env.DEMO_MODE !== "false" || process.env.APP_MODE === "demo",
  authSecret: process.env.AUTH_SECRET,
  googleClientId: process.env.AUTH_GOOGLE_ID,
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET,
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  googleCalendarWebhookSecret: process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.PURDUE_GENAI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? process.env.PURDUE_GENAI_MODEL ?? "gemini-3-flash-preview",
  geminiBaseUrl:
    process.env.GEMINI_BASE_URL ?? process.env.PURDUE_GENAI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
  openaiApiKey: process.env.OPENAI_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  twilioWebhookSecret: process.env.TWILIO_WEBHOOK_SECRET,
};

export function getIntegrationStatus(): IntegrationStatus {
  return {
    googleCalendar: hasEnv("AUTH_GOOGLE_ID") && hasEnv("AUTH_GOOGLE_SECRET") ? "ready" : "demo",
    supabase:
      hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      hasEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") &&
      hasEnv("SUPABASE_SERVICE_ROLE_KEY")
        ? "ready"
        : "demo",
    resend: hasEnv("RESEND_API_KEY") ? "ready" : "demo",
    voice: hasEnv("TWILIO_ACCOUNT_SID") && hasEnv("TWILIO_AUTH_TOKEN") && hasEnv("TWILIO_PHONE_NUMBER") ? "ready" : "demo",
  };
}
