from pathlib import Path
import sys

from fastapi import FastAPI
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from builder_c.starter.data_loader import PersonalizationSignals, StudentCourseSnapshot, TaskInput  # noqa: E402
from builder_c.starter.explanations import build_course_prior_explanation, build_task_risk_explanation  # noqa: E402
from builder_c.starter.task_risk import risk_bucket, score_task_risk  # noqa: E402
from builder_c.starter.train_models import ensure_bundle  # noqa: E402

app = FastAPI(title="Grind ML", version="0.3.0")
_BUNDLE = None


def _bundle():
    global _BUNDLE
    if _BUNDLE is None:
        _BUNDLE = ensure_bundle()
    return _BUNDLE


class CorrectedEffortInput(BaseModel):
    estimated_effort_hours: float = Field(ge=0)
    start_delay_hours: float = Field(default=0, ge=0)


class RiskPriorInput(BaseModel):
    code_module: str
    code_presentation: str
    highest_education: str
    age_band: str
    imd_band: str
    studied_credits: float = Field(ge=0)
    num_of_prev_attempts: float = Field(ge=0)
    disability: str
    gender: str = "unknown"
    days_registered_before_start: float = Field(default=0, ge=0)
    module_presentation_length: float = Field(default=0, ge=0)
    unregistered_by_day_30: float = Field(default=0, ge=0)
    day_of_unregistration_capped: float = Field(default=31, ge=0)
    assessments_due_30d: float = Field(default=0, ge=0)
    assessments_submitted_30d: float = Field(default=0, ge=0)
    assessment_mean_score_30d: float = Field(default=0, ge=0)
    weighted_score_pct_30d: float = Field(default=0, ge=0)
    missing_submissions_30d: float = Field(default=0, ge=0)
    late_submissions_30d: float = Field(default=0, ge=0)
    total_clicks_30d: float = Field(default=0, ge=0)
    active_days_30d: float = Field(default=0, ge=0)
    unique_sites_30d: float = Field(default=0, ge=0)
    unique_activity_types_30d: float = Field(default=0, ge=0)
    pre_start_clicks: float = Field(default=0, ge=0)
    post_start_clicks: float = Field(default=0, ge=0)
    clicks_resource: float = Field(default=0, ge=0)
    clicks_oucontent: float = Field(default=0, ge=0)
    clicks_subpage: float = Field(default=0, ge=0)
    clicks_url: float = Field(default=0, ge=0)
    clicks_forumng: float = Field(default=0, ge=0)
    clicks_quiz: float = Field(default=0, ge=0)


class PersonalizationInput(BaseModel):
    recent_completion_rate: float = Field(default=0.6, ge=0, le=1)
    recent_overdue_count: float = Field(default=0.0, ge=0)
    start_lag_hours: float = Field(default=0.0, ge=0)
    focus_block_accept_rate: float = Field(default=0.7, ge=0, le=1)
    focus_block_completion_rate: float = Field(default=0.6, ge=0, le=1)


class TaskScoreInput(BaseModel):
    task_id: str
    title: str
    course: str
    task_type: str
    estimate_hours: float = Field(ge=0)
    corrected_effort_hours: float = Field(ge=0)
    hours_until_due: float = Field(ge=0)
    start_delay_hours: float = Field(default=0, ge=0)
    status: str = "todo"
    course_risk_prior: float = Field(ge=0, le=1)
    personalization_signals: PersonalizationInput = Field(default_factory=PersonalizationInput)


def _snapshot(payload: RiskPriorInput) -> StudentCourseSnapshot:
    return StudentCourseSnapshot(**payload.model_dump())


def _task(payload: TaskScoreInput) -> TaskInput:
    return TaskInput(
        task_id=payload.task_id,
        title=payload.title,
        course=payload.course,
        task_type=payload.task_type,
        estimate_hours=payload.estimate_hours,
        corrected_effort_hours=payload.corrected_effort_hours,
        hours_until_due=payload.hours_until_due,
        start_delay_hours=payload.start_delay_hours,
        status=payload.status,
        course_risk_prior=payload.course_risk_prior,
    )


def _personalization(payload: PersonalizationInput) -> PersonalizationSignals:
    return PersonalizationSignals(**payload.model_dump())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/corrected-effort")
def corrected_effort(payload: CorrectedEffortInput) -> dict[str, float]:
    corrected = payload.estimated_effort_hours * 1.2 + payload.start_delay_hours * 0.08
    return {"corrected_effort_hours": round(corrected, 2)}


@app.post("/predict/risk-prior")
def risk_prior(payload: RiskPriorInput) -> dict[str, float | str]:
    bundle = _bundle()
    snapshot = _snapshot(payload)
    course_risk_prior = bundle.predict_course_risk_prior(snapshot)
    explanation = build_course_prior_explanation(snapshot, course_risk_prior, bundle.thresholds)
    return {
        "course_risk_prior": course_risk_prior,
        "risk_bucket": risk_bucket(course_risk_prior),
        "risk_explanation": explanation,
    }


@app.post("/predict/failure-risk")
def failure_risk(payload: TaskScoreInput) -> dict[str, float | str]:
    task = _task(payload)
    personalization = _personalization(payload.personalization_signals)
    risk, drivers = score_task_risk(task, personalization)
    explanation = build_task_risk_explanation(
        task,
        risk,
        drivers,
        personalization,
        "The course context is already shaping the baseline risk.",
    )
    return {
        "course_risk_prior": task.course_risk_prior,
        "failure_risk": risk,
        "risk_bucket": risk_bucket(risk),
        "risk_explanation": explanation,
    }


@app.post("/predict/task-score")
def task_score(payload: TaskScoreInput) -> dict[str, float | str]:
    return failure_risk(payload)
