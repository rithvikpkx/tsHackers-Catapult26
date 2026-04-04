from datetime import datetime, timezone

from fastapi import APIRouter

from app.auth import AuthDep
from app.models import PersonalizationSignals, TaskEvent
from app.repos.events_repo import append_event, list_events as list_events_for_user
from app.repos.tasks_repo import get_task_by_id
from app.services.task_refresh import refresh_task_scores
from app.store import derive_personalization_signals

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[TaskEvent])
def list_events(auth=AuthDep) -> list[TaskEvent]:
    return list_events_for_user(auth.user_id)


@router.post("", response_model=PersonalizationSignals)
def log_event(payload: TaskEvent, auth=AuthDep) -> PersonalizationSignals:
    task = get_task_by_id(auth.user_id, payload.task_id)
    if payload.event_type.value == "task_started" and task is not None and "start_lag_hours" not in payload.metadata:
        now = datetime.now(timezone.utc)
        hours_until_due = max((task.due_date - now).total_seconds() / 3600.0, 0.0)
        expected_buffer = max(task.corrected_effort_hours or task.estimated_effort_hours, 1.0)
        payload.metadata["start_lag_hours"] = round(max(expected_buffer - hours_until_due, 0.0), 2)

    append_event(auth.user_id, payload)
    _, signals = refresh_task_scores(auth.user_id)
    return signals


@router.get("/signals", response_model=PersonalizationSignals)
def get_personalization_signals(auth=AuthDep) -> PersonalizationSignals:
    return derive_personalization_signals(auth.user_id, list_events_for_user(auth.user_id))
