# Builder C Starter

This folder now contains the OULAD-backed bootstrap ML layer for Grind.

The model is intentionally not the whole product. It gives Grind a defensible starting `course_risk_prior`, and the app then turns that into task-level `failure_risk` with due-date urgency and lightweight personalization signals.

## What lives here

- `starter/`: OULAD feature engineering, training, task-risk combination, and explanations
- `data/`: demo tasks with course snapshots and personalization signals
- `artifacts/`: trained model, metrics, validation predictions, and demo outputs
- `tests/`: smoke tests for the task-risk combiner

## Training

Set `OULAD_DATA_DIR` to the folder containing the raw CSVs, or keep the local default if the dataset already lives at `C:\Users\athar\Downloads\archive (2)`.

Run from the repo root with the ML environment active:

```powershell
python -m builder_c.starter.train_models
python -m builder_c.starter.run_demo
python -m unittest builder_c.tests.test_pipeline
```

Training will:

- aggregate first-30-day OULAD features
- train a binary `at_risk` logistic baseline
- save metrics and validation predictions
- generate seeded task scores for Builder A and Builder B

## Outputs the rest of the app can rely on

- `course_risk_prior`
- `failure_risk`
- `risk_bucket`
- `risk_explanation`

Corrected effort stays outside the OULAD model in this version.
