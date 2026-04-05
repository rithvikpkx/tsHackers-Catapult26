# Backend (Builder A)

Backend owns the path from incoming assignments to calendar intervention.

## What is scaffolded

- Task ingestion endpoint (seeded/manual-ready contract)
- Intervention planning endpoint (`before` and `after` blocks)
- Calendar focus-block write endpoint (stubbed integration point)
- Shared task/intervention schema aligned with team starter sheet

## Run

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

