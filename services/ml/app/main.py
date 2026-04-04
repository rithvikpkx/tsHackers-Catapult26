from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Grind ML", version="0.1.0")


class DistortionInput(BaseModel):
    estimated_effort_hours: float = Field(ge=0)
    start_delay_hours: float = Field(default=0, ge=0)
    class_load: int = Field(default=4, ge=1)


class RiskInput(BaseModel):
    corrected_effort_hours: float = Field(ge=0)
    hours_until_due: float = Field(ge=0)
    tasks_due_soon: int = Field(default=1, ge=0)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/corrected-effort")
def corrected_effort(payload: DistortionInput) -> dict[str, float]:
    corrected = payload.estimated_effort_hours * 1.25 + payload.start_delay_hours * 0.1
    return {"corrected_effort_hours": round(corrected, 2)}


@app.post("/predict/failure-risk")
def failure_risk(payload: RiskInput) -> dict[str, float | str]:
    pressure = payload.corrected_effort_hours / max(payload.hours_until_due, 1)
    risk = min(0.99, 0.2 + pressure * 0.9 + payload.tasks_due_soon * 0.03)
    explanation = "High workload per hour remaining and multiple near-term tasks increase miss risk."
    return {"failure_risk": round(risk, 2), "explanation": explanation}

