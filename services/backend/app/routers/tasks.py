import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

from app.models import IngestRequest, Task, TaskEvent, TaskEventType
from app.store import TASKS, TASK_EVENTS, store_task, record_event

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "http://localhost:8001")


def _call_ml_endpoint(path: str, payload: dict) -> dict:
    with httpx.Client(timeout=10.0) as client:
        response = client.post(f"{ML_SERVICE_URL}{path}", json=payload)
        response.raise_for_status()
        return response.json()


def _score_task(task: Task) -> Task:
    hours_until_due = max((task.due_date - datetime.now(timezone.utc)).total_seconds() / 3600.0, 0.0)
    payload = {
        "task_id": task.id,
        "title": task.title,
        "course": task.course,
        "task_type": task.task_type,
        "estimate_hours": task.estimated_effort_hours,
        "corrected_effort_hours": task.corrected_effort_hours or task.estimated_effort_hours,
        "hours_until_due": hours_until_due,
        "start_delay_hours": task.predicted_start_delay_hours or 0.0,
        "status": task.status.value if hasattr(task.status, "value") else task.status,
        "course_risk_prior": task.course_risk_prior or 0.0,
        "personalization_signals": {
            "recent_completion_rate": 0.6,
            "recent_overdue_count": 0.0,
            "start_lag_hours": 0.0,
            "focus_block_accept_rate": 0.6,
            "focus_block_completion_rate": 0.6,
        },
    }
    scoring = _call_ml_endpoint("/predict/task-score", payload)
    task.failure_risk = float(scoring.get("failure_risk", task.failure_risk or 0.0))
    task.risk_explanation = scoring.get("risk_explanation", task.risk_explanation)
    task.course_risk_prior = float(scoring.get("course_risk_prior", task.course_risk_prior or 0.0))
    task.corrected_effort_hours = float(task.corrected_effort_hours or _call_ml_endpoint("/predict/corrected-effort", {"estimated_effort_hours": task.estimated_effort_hours, "start_delay_hours": task.predicted_start_delay_hours or 0.0}).get("corrected_effort_hours", task.estimated_effort_hours))
    predictions = _call_ml_endpoint("/predict/task-predictions", payload)
    task.predicted_start_delay_hours = float(predictions.get("predicted_start_delay_hours", task.predicted_start_delay_hours or 0.0))
    task.predicted_completion_hours = float(predictions.get("predicted_completion_hours", task.predicted_completion_hours or task.corrected_effort_hours or 0.0))
    task.best_work_window = predictions.get("best_work_window", task.best_work_window)
    task.preferred_work_times = predictions.get("preferred_work_times", task.preferred_work_times)
    return task


@router.get("", response_model=list[Task])
def list_tasks() -> list[Task]:
    return list(TASKS.values())


@router.post("/ingest")
def ingest_tasks(payload: IngestRequest) -> dict[str, int | str]:
    for task in payload.tasks:
        if task.id not in TASKS:
            record_event(
                TaskEvent(
                    event_type=TaskEventType.TASK_CREATED,
                    task_id=task.id,
                    occurred_at=datetime.now(timezone.utc),
                    metadata={"course": task.course, "task_type": task.task_type},
                )
            )
        updated_task = _score_task(task)
        store_task(updated_task)
    return {"source": payload.source, "ingested_count": len(payload.tasks)}


@router.post("/{task_id}/score", response_model=Task)
def score_task(task_id: str) -> Task:
    task = TASKS.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task = _score_task(task)
    store_task(task)
    return task

