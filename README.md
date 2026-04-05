# Grind

The AI that learns how you actually work, then rewrites your week before you fail.

## Push-Ready Base Structure

```text
.
|- apps/
|  `- frontend/                  # Builder B (Next.js shell + key pages)
|- services/
|  |- backend/                   # Builder A (FastAPI ingestion/intervention/calendar)
|  `- ml/                        # Builder C (FastAPI scoring API)
|- packages/
|  `- contracts/                 # Shared JSON schemas to freeze I/O early
|- builder_c/                    # Builder C starter data, training code, and artifacts
|- data/
|  `- seed/                      # Demo seed tasks
|- docs/
|  `- team_handoff.md            # Integration checkpoints
`- project_materials/            # Hackathon briefs
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

## Builder C Scope

Builder C now has two connected pieces:

- `services/ml/` for the FastAPI scoring service that the rest of the app can call
- `builder_c/` for the OULAD bootstrap prior, task-risk combiner, generated artifacts, and tests

The current ML layer includes:

- a first-30-day OULAD feature pipeline
- a trainable binary `at_risk` bootstrap prior for course context
- a task-risk combiner that layers urgency and personalization on top
- a plain-English risk explanation for Builder B's surfaces
- seeded demo task outputs for Builder A/B integration

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

Builder C starter pipeline:

```bash
set OULAD_DATA_DIR=C:\path\to\oulad
python -m builder_c.starter.train_models
python -m builder_c.starter.run_demo
python -m unittest builder_c.tests.test_pipeline
```

Frontend:

```bash
cd apps/frontend
npm install
npm run dev
```
