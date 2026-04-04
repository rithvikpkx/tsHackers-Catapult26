# ML Service (Builder C)

FastAPI service for corrected-effort prediction, failure-risk scoring, and full task scoring.

This service now uses the trainable starter in `builder_c/`, so Builder C can keep improving the model logic without changing the API surface every time.

## Endpoints

- `GET /health`
- `POST /predict/corrected-effort`
- `POST /predict/failure-risk`
- `POST /predict/task-score`

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Training And Demo

From the repo root:

```bash
python -m builder_c.starter.train_models
python -m builder_c.starter.run_demo
python -m unittest builder_c.tests.test_pipeline
```

