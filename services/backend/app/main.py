from fastapi import FastAPI

from app.routers import calendar, events, interventions, tasks

app = FastAPI(title="Grind Backend", version="0.1.0")

app.include_router(tasks.router)
app.include_router(interventions.router)
app.include_router(calendar.router)
app.include_router(events.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

