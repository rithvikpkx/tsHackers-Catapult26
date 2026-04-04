from httpx import HTTPError

from app.models import PersonalizationSignals, Task, TaskStatus
from app.repos.events_repo import list_events
from app.repos.tasks_repo import list_tasks, upsert_tasks
from app.services.ml_client import enrich_task_with_ml
from app.store import derive_personalization_signals


def refresh_personalization(user_id: str) -> PersonalizationSignals:
    events = list_events(user_id)
    return derive_personalization_signals(user_id, events)


def refresh_task_scores(user_id: str) -> tuple[list[Task], PersonalizationSignals]:
    tasks = list_tasks(user_id)
    signals = refresh_personalization(user_id)
    refreshed: list[Task] = []

    for task in tasks:
        if task.status == TaskStatus.DONE:
            task.failure_risk = 0.05
            if not task.risk_explanation:
                task.risk_explanation = "This task is complete, so it is no longer driving failure risk."
            refreshed.append(task)
            continue

        try:
            refreshed.append(enrich_task_with_ml(task, signals))
        except HTTPError:
            refreshed.append(task)

    if refreshed:
        upsert_tasks(user_id, refreshed)
    return refreshed, signals
