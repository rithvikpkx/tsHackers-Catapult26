import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
import sys

import httpx

from app.config import settings
from app.models import PersonalizationSignals, Task

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEMO_TASKS_PATH = PROJECT_ROOT / "builder_c" / "data" / "demo_tasks.json"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from builder_c.starter.data_loader import PersonalizationSignals as BuilderSignals  # noqa: E402
from builder_c.starter.data_loader import TaskInput as BuilderTaskInput  # noqa: E402
from builder_c.starter.explanations import build_task_risk_explanation  # noqa: E402
from builder_c.starter.task_risk import score_task_risk  # noqa: E402


@lru_cache(maxsize=1)
def _demo_task_context() -> dict[str, dict]:
    if not DEMO_TASKS_PATH.exists():
        return {}
    payload = json.loads(DEMO_TASKS_PATH.read_text(encoding="utf-8"))
    context: dict[str, dict] = {}
    for row in payload:
        context[str(row["task_id"])] = row
        context.setdefault(str(row["course"]).lower(), row)
    return context


def _infer_task_type(task: Task) -> str:
    if task.task_type:
        return task.task_type

    title = task.title.lower()
    if "quiz" in title or "exam" in title:
        return "quiz"
    if "read" in title or "response" in title:
        return "reading"
    if "project" in title:
        return "project"
    if "problem set" in title or "pset" in title:
        return "problem_set"
    return "assignment"


def _course_snapshot(task: Task) -> dict | None:
    if task.course_snapshot:
        return task.course_snapshot

    lookup = _demo_task_context()
    match = lookup.get(task.id) or lookup.get(task.course.lower())
    if match:
        if not task.task_type:
            task.task_type = match.get("task_type")
        return match.get("course_snapshot")
    return None


def _default_course_risk(task: Task) -> float:
    if "exam" in task.title.lower() or "quiz" in task.title.lower():
        return 0.48
    return 0.4


def _default_course_prior_explanation(task: Task) -> str:
    if "exam" in task.title.lower() or "quiz" in task.title.lower():
        return "The course prior is a bootstrap estimate until live course context is available."
    return "The course prior is a bootstrap estimate because no course-history snapshot is available yet."


def _local_corrected_effort(task: Task, signals: PersonalizationSignals) -> float:
    corrected = task.estimated_effort_hours * 1.2 + signals.start_lag_hours * 0.08
    return round(corrected, 2)


def _local_task_scoring(
    task: Task,
    signals: PersonalizationSignals,
    task_type: str,
    corrected_effort: float,
    course_risk_prior: float,
    course_prior_explanation: str,
) -> tuple[float, str]:
    now = datetime.now(timezone.utc)
    builder_task = BuilderTaskInput(
        task_id=task.id,
        title=task.title,
        course=task.course,
        task_type=task_type,
        estimate_hours=task.estimated_effort_hours,
        corrected_effort_hours=corrected_effort,
        hours_until_due=max(1.0, (task.due_date - now).total_seconds() / 3600.0),
        start_delay_hours=signals.start_lag_hours,
        status=task.status.value,
        course_risk_prior=course_risk_prior,
    )
    builder_signals = BuilderSignals(
        recent_completion_rate=signals.recent_completion_rate,
        recent_overdue_count=signals.recent_overdue_count,
        start_lag_hours=signals.start_lag_hours,
        focus_block_accept_rate=signals.focus_block_accept_rate,
        focus_block_completion_rate=signals.focus_block_completion_rate,
    )
    failure_risk, drivers = score_task_risk(builder_task, builder_signals)
    explanation = build_task_risk_explanation(
        builder_task,
        failure_risk,
        drivers,
        builder_signals,
        course_prior_explanation,
    )
    return failure_risk, explanation


def enrich_task_with_ml(task: Task, signals: PersonalizationSignals) -> Task:
    corrected_effort = task.corrected_effort_hours
    course_risk_prior = task.course_risk_prior
    failure_risk = task.failure_risk
    risk_explanation = task.risk_explanation
    task_type = _infer_task_type(task)
    snapshot = _course_snapshot(task)
    course_prior_explanation = _default_course_prior_explanation(task)

    try:
        with httpx.Client(timeout=8.0) as client:
            if corrected_effort is None:
                response = client.post(
                    f"{settings.ml_service_url}/predict/corrected-effort",
                    json={
                        "estimated_effort_hours": task.estimated_effort_hours,
                        "start_delay_hours": signals.start_lag_hours,
                    },
                )
                response.raise_for_status()
                corrected_effort = float(response.json()["corrected_effort_hours"])

            if course_risk_prior is None:
                if snapshot:
                    response = client.post(
                        f"{settings.ml_service_url}/predict/risk-prior",
                        json=snapshot,
                    )
                    response.raise_for_status()
                    prior_payload = response.json()
                    course_risk_prior = float(prior_payload["course_risk_prior"])
                    course_prior_explanation = str(prior_payload["risk_explanation"])
                else:
                    course_risk_prior = _default_course_risk(task)
                    course_prior_explanation = _default_course_prior_explanation(task)

            response = client.post(
                f"{settings.ml_service_url}/predict/task-score",
                json={
                    "task_id": task.id,
                    "title": task.title,
                    "course": task.course,
                    "task_type": task_type,
                    "estimate_hours": task.estimated_effort_hours,
                    "corrected_effort_hours": corrected_effort,
                    "hours_until_due": max(1.0, (task.due_date - datetime.now(timezone.utc)).total_seconds() / 3600.0),
                    "start_delay_hours": signals.start_lag_hours,
                    "status": task.status.value,
                    "course_risk_prior": course_risk_prior,
                    "personalization_signals": signals.model_dump(),
                },
            )
            response.raise_for_status()
            payload = response.json()
            failure_risk = float(payload["failure_risk"])
            risk_explanation = str(payload["risk_explanation"])
    except httpx.HTTPError:
        corrected_effort = corrected_effort if corrected_effort is not None else _local_corrected_effort(task, signals)
        course_risk_prior = course_risk_prior if course_risk_prior is not None else _default_course_risk(task)
        failure_risk, risk_explanation = _local_task_scoring(
            task,
            signals,
            task_type,
            corrected_effort,
            course_risk_prior,
            course_prior_explanation,
        )

    task.task_type = task_type
    task.course_snapshot = snapshot
    task.corrected_effort_hours = corrected_effort
    task.course_risk_prior = course_risk_prior
    task.failure_risk = failure_risk
    task.risk_explanation = risk_explanation
    return task
