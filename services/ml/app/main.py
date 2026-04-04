from pathlib import Path
import sys

from fastapi import FastAPI
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from builder_c.starter.data_loader import TaskInput  # noqa: E402
from builder_c.starter.explanations import build_risk_explanation  # noqa: E402
from builder_c.starter.train_models import ensure_models, score_task  # noqa: E402

app = FastAPI(title="Grind ML", version="0.2.0")
DISTORTION_MODEL, RISK_MODEL = ensure_models()


class DistortionInput(BaseModel):
    estimated_effort_hours: float = Field(ge=0)
    start_delay_hours: float = Field(default=0, ge=0)
    class_load: int = Field(default=4, ge=1)
    hours_until_due: float = Field(default=48, ge=0)
    task_type: str = Field(default="problem_set")


class RiskInput(BaseModel):
    corrected_effort_hours: float = Field(ge=0)
    hours_until_due: float = Field(ge=0)
    tasks_due_soon: int = Field(default=1, ge=0)
    start_delay_hours: float = Field(default=0, ge=0)
    class_load: int = Field(default=4, ge=1)
    task_type: str = Field(default="problem_set")


class TaskScoreInput(BaseModel):
    task_id: str
    title: str
    course: str
    task_type: str
    estimate_hours: float = Field(ge=0)
    hours_until_due: float = Field(ge=0)
    start_delay_hours: float = Field(default=0, ge=0)
    weekly_course_load: float = Field(default=4, ge=0)


def _task_from_distortion(payload: DistortionInput) -> TaskInput:
    return TaskInput(
        task_id="distortion-preview",
        title="Distortion preview",
        course="Unknown",
        task_type=payload.task_type,
        estimate_hours=payload.estimated_effort_hours,
        hours_until_due=payload.hours_until_due,
        start_delay_hours=payload.start_delay_hours,
        weekly_course_load=float(payload.class_load),
    )


def _task_from_risk(payload: RiskInput) -> TaskInput:
    return TaskInput(
        task_id="risk-preview",
        title="Risk preview",
        course="Unknown",
        task_type=payload.task_type,
        estimate_hours=payload.corrected_effort_hours,
        hours_until_due=payload.hours_until_due,
        start_delay_hours=payload.start_delay_hours,
        weekly_course_load=float(payload.class_load + payload.tasks_due_soon),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/corrected-effort")
def corrected_effort(payload: DistortionInput) -> dict[str, float]:
    task = _task_from_distortion(payload)
    multiplier = DISTORTION_MODEL.predict_multiplier(task)
    corrected = DISTORTION_MODEL.predict_corrected_effort(task)
    return {
        "corrected_effort_hours": corrected,
        "distortion_multiplier": multiplier,
    }


@app.post("/predict/failure-risk")
def failure_risk(payload: RiskInput) -> dict[str, float | str]:
    task = _task_from_risk(payload)
    risk = RISK_MODEL.predict_probability(task, payload.corrected_effort_hours)
    explanation = build_risk_explanation(task, payload.corrected_effort_hours, risk)
    return {
        "failure_risk": risk,
        "explanation": explanation,
    }


@app.post("/predict/task-score")
def task_score(payload: TaskScoreInput) -> dict[str, str | float]:
    task = TaskInput(
        task_id=payload.task_id,
        title=payload.title,
        course=payload.course,
        task_type=payload.task_type,
        estimate_hours=payload.estimate_hours,
        hours_until_due=payload.hours_until_due,
        start_delay_hours=payload.start_delay_hours,
        weekly_course_load=payload.weekly_course_load,
    )
    return score_task(task, DISTORTION_MODEL, RISK_MODEL).to_dict()
