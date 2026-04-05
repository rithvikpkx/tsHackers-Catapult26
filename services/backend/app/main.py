from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import calendar, events, interventions, onboarding, tasks

app = FastAPI(title="Grind Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(interventions.router)
app.include_router(calendar.router)
app.include_router(events.router)
app.include_router(onboarding.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

