# Grind Frontend

## Run locally

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and fill in what you have available.

Required for the current demo:

- none, the seeded scenario works without external services

Optional for live integrations:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TO_EMAIL` (optional fallback recipient when no signed-in email is present)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_WEBHOOK_SECRET`

## On-demand email notifications

- Open the notification center in the header.
- Click `Send now` on any email notification.
- The app posts to `POST /api/notifications/send`, sends through Resend, and updates notification status in Supabase.

## Implementation notes

- The current app uses an in-memory seeded repository so the task flow, intervention flow, email payloads, and voice responses are all interactive without a backend.
- Domain logic lives under `lib/grind/*` and is split by concern so you can swap providers or change heuristics without rewriting pages.
- The Supabase migration already reflects the intended live data model for tasks, subtasks, schedule events, profiles, observations, risk assessments, interventions, notifications, and focus sessions.
