import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models import (
    CalendarBlock,
    PersonalizationSignals,
    Task,
    TaskEvent,
    TaskEventType,
)
from app.supabase_client import get_supabase_client

TASKS: dict[str, Task] = {}
TASK_EVENTS: list[TaskEvent] = []
PROJECT_ROOT = Path(__file__).resolve().parents[3]
SEED_TASKS_PATH = PROJECT_ROOT / "data" / "seed" / "tasks.json"
SUPABASE_CLIENT = get_supabase_client()
USER_ID = os.environ.get("GRIND_USER_ID", "default-user")


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


def _supabase_upsert(table: str, row: dict[str, Any], on_conflict: str | None = None) -> None:
    if SUPABASE_CLIENT is None:
        return

    payload = {k: _serialize_value(v) for k, v in row.items() if v is not None}
    if on_conflict:
        SUPABASE_CLIENT.table(table).upsert(payload, on_conflict=on_conflict).execute()
    else:
        SUPABASE_CLIENT.table(table).insert(payload).execute()


def _load_supabase_tasks() -> None:
    if SUPABASE_CLIENT is None:
        return

    response = SUPABASE_CLIENT.table("tasks").select("*").eq("user_id", USER_ID).execute()
    if response.error or response.data is None:
        return

    for item in response.data:
        try:
            task = Task.model_validate(item)
            TASKS[task.id] = task
        except Exception:
            continue


def _sync_user_signals(signals: PersonalizationSignals) -> None:
    if SUPABASE_CLIENT is None:
        return

    row = {
        "user_id": USER_ID,
        "recent_completion_rate": signals.recent_completion_rate,
        "recent_overdue_count": signals.recent_overdue_count,
        "start_lag_hours": signals.start_lag_hours,
        "focus_block_accept_rate": signals.focus_block_accept_rate,
        "focus_block_completion_rate": signals.focus_block_completion_rate,
        "preferred_work_times": signals.__dict__.get("preferred_work_times", {}),
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _supabase_upsert("user_signals", row, on_conflict="user_id")


def load_seed_tasks() -> None:
    if TASKS or not SEED_TASKS_PATH.exists():
        return
    payload = json.loads(SEED_TASKS_PATH.read_text(encoding="utf-8"))
    for item in payload:
        task = Task.model_validate(item)
        TASKS[task.id] = task


def store_task(task: Task) -> None:
    TASKS[task.id] = task
    _supabase_upsert("tasks", {**task.model_dump(mode="json"), "user_id": USER_ID}, on_conflict="id")


def store_calendar_blocks(blocks: list[CalendarBlock]) -> None:
    if SUPABASE_CLIENT is None:
        return

    for block in blocks:
        row = {**block.model_dump(mode="json"), "user_id": USER_ID}
        _supabase_upsert("calendar_blocks", row)


def _record_training_example(task: Task, event: TaskEvent) -> None:
    if SUPABASE_CLIENT is None:
        return

    features = {
        "task_type": task.task_type,
        "estimated_effort_hours": task.estimated_effort_hours,
        "corrected_effort_hours": task.corrected_effort_hours,
        "hours_until_due": (task.due_date - datetime.now(timezone.utc)).total_seconds() / 3600,
        "start_delay_hours": float(event.metadata.get("start_lag_hours", 0.0)),
        "course_risk_prior": task.course_risk_prior,
        "status": task.status,
        "preferred_work_times": task.preferred_work_times,
    }
    label = {
        "actual_duration_hours": task.actual_duration_hours,
        "completed_on_time": event.event_type == TaskEventType.TASK_COMPLETED and task.end_timestamp is not None and task.end_timestamp <= task.due_date,
        "failure_risk": task.failure_risk,
    }
    _supabase_upsert(
        "training_examples",
        {
            "user_id": USER_ID,
            "task_id": task.id,
            "features": features,
            "label": label,
            "source": "frontend_event",
        },
    )


def derive_personalization_signals() -> PersonalizationSignals:
    if SUPABASE_CLIENT is not None:
        response = SUPABASE_CLIENT.table("user_signals").select("*").eq("user_id", USER_ID).single().execute()
        if response.data:
            row = response.data
            return PersonalizationSignals(
                recent_completion_rate=float(row.get("recent_completion_rate", 0.0)),
                recent_overdue_count=float(row.get("recent_overdue_count", 0.0)),
                start_lag_hours=float(row.get("start_lag_hours", 0.0)),
                focus_block_accept_rate=float(row.get("focus_block_accept_rate", 0.0)),
                focus_block_completion_rate=float(row.get("focus_block_completion_rate", 0.0)),
            )

    created = sum(1 for event in TASK_EVENTS if event.event_type == TaskEventType.TASK_CREATED)
    completed = sum(1 for event in TASK_EVENTS if event.event_type == TaskEventType.TASK_COMPLETED)
    overdue = sum(1 for event in TASK_EVENTS if event.event_type == TaskEventType.TASK_OVERDUE)
    accepted = sum(1 for event in TASK_EVENTS if event.event_type == TaskEventType.FOCUS_BLOCK_ACCEPTED)
    focus_completed = sum(1 for event in TASK_EVENTS if event.event_type == TaskEventType.FOCUS_BLOCK_COMPLETED)
    start_lags = [
        float(event.metadata.get("start_lag_hours", 0.0))
        for event in TASK_EVENTS
        if event.event_type == TaskEventType.TASK_STARTED
    ]

    recent_completion_rate = completed / max(created, 1)
    focus_block_accept_rate = accepted / max(created, 1)
    focus_block_completion_rate = focus_completed / max(accepted, 1)
    start_lag_hours = sum(start_lags) / len(start_lags) if start_lags else 0.0

    return PersonalizationSignals(
        recent_completion_rate=min(max(recent_completion_rate, 0.0), 1.0),
        recent_overdue_count=float(overdue),
        start_lag_hours=max(start_lag_hours, 0.0),
        focus_block_accept_rate=min(max(focus_block_accept_rate, 0.0), 1.0),
        focus_block_completion_rate=min(max(focus_block_completion_rate, 0.0), 1.0),
    )


def record_event(event: TaskEvent) -> None:
    TASK_EVENTS.append(event)
    _supabase_upsert("task_events", {**event.model_dump(mode="json"), "user_id": USER_ID})

    if event.event_type == TaskEventType.TASK_STARTED:
        task = TASKS.get(event.task_id)
        if task:
            task.start_timestamp = event.occurred_at
            task.predicted_start_delay_hours = float(event.metadata.get("start_lag_hours", 0.0))
            store_task(task)

    if event.event_type == TaskEventType.TASK_COMPLETED:
        task = TASKS.get(event.task_id)
        if task:
            task.end_timestamp = event.occurred_at
            task.actual_duration_hours = float(event.metadata.get("actual_duration_hours", 0.0))
            task.status = TaskEventType.TASK_COMPLETED.value
            store_task(task)
            _record_training_example(task, event)

    _sync_user_signals(derive_personalization_signals())


load_seed_tasks()
_load_supabase_tasks()

