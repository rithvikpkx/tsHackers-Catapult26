# Backend (Builder A)

Backend owns the path from incoming assignments to calendar intervention.

## What is scaffolded

- User-scoped task ingestion endpoint with ML enrichment
- Intervention planning endpoint (`before` and `after` blocks)
- Calendar OAuth start/callback scaffolding
- Calendar focus-block write endpoint (stubbed integration point)
- Supabase-ready data layer for `public.tasks`
- Shared contracts aligned with Builder C model outputs

## Manual setup required

1. Create Supabase project and run `supabase/migrations/20260404_0001_init_grind.sql`.
2. Copy `.env.example` to `.env` and fill credentials.
3. Keep `AUTH_BYPASS=true` initially, then set `AUTH_BYPASS=false` once bearer auth is wired.
4. Add Google OAuth credentials for calendar connect flow.

## Run

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

See `docs/builder_a_backend_setup.md` for full runbook.
