from fastapi import APIRouter, HTTPException
from httpx import HTTPError

from app.auth import AuthDep
from app.models import IngestRequest, Task, TaskEvent, TaskEventType, TaskStatusUpdate
from app.repos.events_repo import append_event
from app.repos.tasks_repo import get_task_by_id, upsert_tasks
from app.services.ml_client import enrich_task_with_ml
from app.services.task_refresh import refresh_personalization, refresh_task_scores

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
def list_tasks(auth=AuthDep) -> list[Task]:
    tasks, _ = refresh_task_scores(auth.user_id)
    return tasks


@router.post("/ingest")
def ingest_tasks(payload: IngestRequest, auth=AuthDep) -> dict[str, int | str]:
    signals = refresh_personalization(auth.user_id)
    enriched_tasks: list[Task] = []

    for task in payload.tasks:
        task.user_id = auth.user_id
        try:
            enriched_tasks.append(enrich_task_with_ml(task, signals))
        except HTTPError:
            # Keep ingestion resilient when ML service is down during hackathon runs.
            enriched_tasks.append(task)

        append_event(
            auth.user_id,
            TaskEvent(
                event_type=TaskEventType.TASK_CREATED,
                task_id=task.id,
                occurred_at=task.updated_at,
                metadata={"course": task.course},
            )
        )

    ingested_count = upsert_tasks(auth.user_id, enriched_tasks, payload.source)
    return {"source": payload.source, "ingested_count": ingested_count}


@router.patch("/{task_id}/status", response_model=Task)
def update_task_status(task_id: str, payload: TaskStatusUpdate, auth=AuthDep) -> Task:
    task = get_task_by_id(auth.user_id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = payload.status
    upsert_tasks(auth.user_id, [task])
    tasks, _ = refresh_task_scores(auth.user_id)
    for candidate in tasks:
        if candidate.id == task_id:
            return candidate
    return task

