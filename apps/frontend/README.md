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

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `VOICE_PROVIDER`
- `VOICE_WEBHOOK_SECRET`

## Implementation notes

- The current app uses an in-memory seeded repository so the task flow, intervention flow, email payloads, and voice responses are all interactive without a backend.
- Domain logic lives under `lib/grind/*` and is split by concern so you can swap providers or change heuristics without rewriting pages.
- The Supabase migration already reflects the intended live data model for tasks, subtasks, schedule events, profiles, observations, risk assessments, interventions, notifications, and focus sessions.
