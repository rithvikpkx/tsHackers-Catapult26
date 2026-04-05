# Grind

Fresh MVP scaffold for a modular academic execution app.

## Project layout

- `apps/frontend`: Next.js App Router app with the current Grind implementation
- `supabase`: database schema for tasks, subtasks, profiles, risk assessments, interventions, and notifications
- `services/ml`: placeholder for future Python experimentation; v1 logic lives in the Next.js app

## Current build shape

- Demo-first seeded pipeline that runs end-to-end inside the app
- Modular domain code for normalization, subtask generation, profile modeling, risk scoring, interventions, email payloads, and voice scripts
- UI surfaces for Pulse, Tasks, Interventions, Profile, Focus, and Admin
- Supabase schema ready for a live backend hookup

## Next step

Set environment variables in `apps/frontend/.env.example`, then run the frontend from `apps/frontend`.

## Google AI Studio

The live subtask breakdown pipeline can use Google AI Studio's native Gemini API for higher-quality task decomposition. Live sync batches up to 3 tasks per Gemini call, processes those batches sequentially, and applies conservative pacing plus 429 backoff to reduce rate-limit pressure.

Set these values in `apps/frontend/.env.local`:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default: `gemini-3-flash-preview`)
- `GEMINI_BASE_URL` (default: `https://generativelanguage.googleapis.com/v1beta`)
