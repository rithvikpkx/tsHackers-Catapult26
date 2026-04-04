# Grind

The AI that learns how you actually work, then rewrites your week before you fail.

## Push-Ready Base Structure

```text
.
├─ apps/
│  └─ frontend/                  # Builder B (Next.js shell + key pages)
├─ services/
│  ├─ backend/                   # Builder A (FastAPI ingestion/intervention/calendar)
│  └─ ml/                        # Builder C (FastAPI model stubs + scoring API)
├─ packages/
│  └─ contracts/                 # Shared JSON schemas to freeze I/O early
├─ data/
│  └─ seed/                      # Demo seed tasks
├─ docs/
│  └─ team_handoff.md            # Integration checkpoints
└─ project_materials/            # Hackathon briefs
```

## Builder A Backend Scope

Already scaffolded in `services/backend`:

- `POST /api/tasks/ingest` for seeded/manual assignment ingestion
- `GET /api/tasks` for task list retrieval
- `POST /api/interventions/plan` for before/after schedule plan payload
- `POST /api/calendar/focus-block` as the Google Calendar integration point

Key files:

- `services/backend/app/main.py`
- `services/backend/app/models.py`
- `services/backend/app/routers/tasks.py`
- `services/backend/app/routers/interventions.py`
- `services/backend/app/routers/calendar.py`

## Quick Start

Backend:

```bash
cd services/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

ML service:

```bash
cd services/ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Frontend:

```bash
cd apps/frontend
npm install
npm run dev
```

