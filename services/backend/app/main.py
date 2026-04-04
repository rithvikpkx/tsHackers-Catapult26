from fastapi import FastAPI

from app.routers import calendar, interventions, tasks

app = FastAPI(title="Grind Backend", version="0.1.0")

app.include_router(tasks.router)
app.include_router(interventions.router)
app.include_router(calendar.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

