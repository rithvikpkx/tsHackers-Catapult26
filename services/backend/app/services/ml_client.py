import httpx

from app.config import settings
from app.models import PersonalizationSignals, Task


def enrich_task_with_ml(task: Task, signals: PersonalizationSignals) -> Task:
    corrected_effort = task.corrected_effort_hours
    course_risk_prior = task.course_risk_prior
    failure_risk = task.failure_risk
    risk_explanation = task.risk_explanation

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
            course_risk_prior = 0.55

        response = client.post(
            f"{settings.ml_service_url}/predict/task-score",
            json={
                "task_id": task.id,
                "title": task.title,
                "course": task.course,
                "task_type": "assignment",
                "estimate_hours": task.estimated_effort_hours,
                "corrected_effort_hours": corrected_effort,
                "hours_until_due": max(
                    1.0, (task.due_date - task.updated_at).total_seconds() / 3600.0
                ),
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

    task.corrected_effort_hours = corrected_effort
    task.course_risk_prior = course_risk_prior
    task.failure_risk = failure_risk
    task.risk_explanation = risk_explanation
    return task

