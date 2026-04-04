import json
from pathlib import Path
from typing import Any

from app.models import PersonalizationSignals, Task, TaskEvent, TaskEventType

TASKS: dict[str, Task] = {}
TASK_EVENTS: list[TaskEvent] = []
CALENDAR_CONNECTIONS: dict[str, dict[str, Any]] = {}

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SEED_TASKS_PATH = PROJECT_ROOT / "data" / "seed" / "tasks.json"


def load_seed_tasks() -> None:
    if TASKS or not SEED_TASKS_PATH.exists():
        return
    payload = json.loads(SEED_TASKS_PATH.read_text(encoding="utf-8"))
    for item in payload:
        task = Task.model_validate(item)
        TASKS[task.id] = task


def derive_personalization_signals(
    user_id: str | None = None, events: list[TaskEvent] | None = None
) -> PersonalizationSignals:
    relevant_events = events if events is not None else TASK_EVENTS
    if user_id:
        relevant_events = [event for event in relevant_events if event.metadata.get("user_id") == user_id]

    created = sum(1 for event in relevant_events if event.event_type == TaskEventType.TASK_CREATED)
    completed = sum(1 for event in relevant_events if event.event_type == TaskEventType.TASK_COMPLETED)
    overdue = sum(1 for event in relevant_events if event.event_type == TaskEventType.TASK_OVERDUE)
    accepted = sum(1 for event in relevant_events if event.event_type == TaskEventType.FOCUS_BLOCK_ACCEPTED)
    focus_completed = sum(
        1 for event in relevant_events if event.event_type == TaskEventType.FOCUS_BLOCK_COMPLETED
    )
    start_lags = [
        float(event.metadata.get("start_lag_hours", 0.0))
        for event in relevant_events
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


load_seed_tasks()

