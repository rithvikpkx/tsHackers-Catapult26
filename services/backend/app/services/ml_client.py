import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import httpx

from app.config import settings
from app.models import PersonalizationSignals, Task

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEMO_TASKS_PATH = PROJECT_ROOT / "builder_c" / "data" / "demo_tasks.json"


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


def enrich_task_with_ml(task: Task, signals: PersonalizationSignals) -> Task:
    corrected_effort = task.corrected_effort_hours
    course_risk_prior = task.course_risk_prior
    failure_risk = task.failure_risk
    risk_explanation = task.risk_explanation
    task_type = _infer_task_type(task)
    snapshot = _course_snapshot(task)
    now = datetime.now(timezone.utc)

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
                risk_explanation = str(prior_payload["risk_explanation"])
            else:
                course_risk_prior = _default_course_risk(task)

        response = client.post(
            f"{settings.ml_service_url}/predict/task-score",
            json={
                "task_id": task.id,
                "title": task.title,
                "course": task.course,
                "task_type": task_type,
                "estimate_hours": task.estimated_effort_hours,
                "corrected_effort_hours": corrected_effort,
                "hours_until_due": max(1.0, (task.due_date - now).total_seconds() / 3600.0),
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

    task.task_type = task_type
    task.course_snapshot = snapshot
    task.corrected_effort_hours = corrected_effort
    task.course_risk_prior = course_risk_prior
    task.failure_risk = failure_risk
    task.risk_explanation = risk_explanation
    return task
