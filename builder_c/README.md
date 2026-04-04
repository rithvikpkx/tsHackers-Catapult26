# Builder C Starter

This folder gives Builder C a beginner-friendly starting point for the Grind hackathon build.

It covers the first useful slice from the brief:

- a distortion model that turns raw estimates into corrected effort
- a failure-risk model that assigns a miss probability
- a user-facing risk explanation
- a simple JSON contract that Builders A and B can consume
- a tiny HTTP API so the team can demo the ML output without waiting on a full service rewrite

The code intentionally stays readable and dependency-light. Everything here runs on the Python standard library so the team can start iterating immediately, then swap pieces out for scikit-learn or FastAPI later if needed.

## Folder layout

- `data/`: seeded training data and demo tasks
- `contracts/`: request/response shape for the scoring endpoint
- `starter/`: the actual training, scoring, and serving code
- `artifacts/`: generated model snapshot and example predictions
- `tests/`: smoke coverage for the starter pipeline

## Quick start

From the repo root:

```powershell
python -m builder_c.starter.train_models
python -m builder_c.starter.run_demo
python -m unittest builder_c.tests.test_pipeline
```

To run the local JSON API:

```powershell
python -m builder_c.starter.serve_api
```

Then `POST` a task to `http://localhost:8000/score`.

## What Builders A and B can rely on

The scoring response always includes:

- `corrected_effort_hours`
- `distortion_multiplier`
- `failure_probability`
- `risk_bucket`
- `risk_explanation`

That gives the frontend enough to show:

- original estimate vs corrected estimate
- a risk chip or progress meter
- a plain-English "why this is risky" panel

## Suggested next upgrades

- replace the pure-Python regressions with scikit-learn once the environment is ready
- move the API from the built-in HTTP server to FastAPI
- add real assignment history from Builder A's ingestion path
- track intervention outcomes so the models can learn from schedule changes
