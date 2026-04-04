# Builder A Backend Setup Runbook

This repo is now scaffolded up to the manual credential steps.

## What is already wired in code

- User-scoped backend routes with auth dependency.
- Supabase-ready repositories for tasks (`public.tasks`).
- ML enrichment during ingestion using Builder C service.
- Google Calendar OAuth start/callback scaffolding.
- SQL migration for schema + RLS in `supabase/migrations/20260404_0001_init_grind.sql`.

## What you need to do manually

1. Create a Supabase project.
2. Run the SQL migration in Supabase SQL editor.
3. Create `services/backend/.env` from `.env.example` and fill:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Set `AUTH_BYPASS=false` after validating auth works.
5. Configure Google OAuth credentials in Google Cloud Console and fill:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

## Local run sequence

1. Start ML service on `:8001`.
2. Start backend on `:8000`.
3. Keep `AUTH_BYPASS=true` for first local smoke test.
4. Ingest tasks via `POST /api/tasks/ingest`.
5. Verify enriched fields appear on `GET /api/tasks`.
6. Turn off bypass and test with a real Supabase bearer token.

## Recommended first integration checks

- `GET /health`
- `POST /api/tasks/ingest` with seeded payload
- `GET /api/tasks`
- `POST /api/interventions/plan`
- `GET /api/calendar/connect/start`

