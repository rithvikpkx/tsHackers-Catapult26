from fastapi import APIRouter
from httpx import HTTPError

from app.auth import AuthDep
from app.models import IngestRequest, Task, TaskEvent, TaskEventType
from app.repos.tasks_repo import list_tasks as list_tasks_for_user
from app.repos.tasks_repo import upsert_tasks
from app.services.ml_client import enrich_task_with_ml
from app.store import TASK_EVENTS, derive_personalization_signals, load_seed_tasks

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
def list_tasks(auth=AuthDep) -> list[Task]:
    load_seed_tasks()
    return list_tasks_for_user(auth.user_id)


@router.post("/ingest")
def ingest_tasks(payload: IngestRequest, auth=AuthDep) -> dict[str, int | str]:
    signals = derive_personalization_signals(auth.user_id)
    enriched_tasks: list[Task] = []

    for task in payload.tasks:
        task.user_id = auth.user_id
        try:
            enriched_tasks.append(enrich_task_with_ml(task, signals))
        except HTTPError:
            # Keep ingestion resilient when ML service is down during hackathon runs.
            enriched_tasks.append(task)

        TASK_EVENTS.append(
            TaskEvent(
                event_type=TaskEventType.TASK_CREATED,
                task_id=task.id,
                occurred_at=task.updated_at,
                metadata={"course": task.course, "user_id": auth.user_id},
            )
        )

    ingested_count = upsert_tasks(auth.user_id, enriched_tasks, payload.source)
    return {"source": payload.source, "ingested_count": ingested_count}

