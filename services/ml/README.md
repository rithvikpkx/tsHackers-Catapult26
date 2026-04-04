# ML Service (Builder C)

FastAPI service for the OULAD bootstrap risk prior and the final Grind task-risk combiner.

## Endpoints

- `GET /health`
- `POST /predict/corrected-effort`
- `POST /predict/risk-prior`
- `POST /predict/failure-risk`
- `POST /predict/task-score`

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001
```

For the full local MVP on Windows, prefer launching everything from the repo root:

```powershell
.\scripts\start_mvp.cmd
.\scripts\check_mvp.cmd
.\scripts\stop_mvp.cmd
```

## Train The OULAD Prior

Set `OULAD_DATA_DIR` if the dataset is not already available at the local default path, then run:

```bash
python -m builder_c.starter.train_models
python -m builder_c.starter.run_demo
python -m unittest builder_c.tests.test_pipeline
```
