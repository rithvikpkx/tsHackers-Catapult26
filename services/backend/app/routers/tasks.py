from datetime import datetime, timezone

from fastapi import APIRouter

from app.models import IngestRequest, Task, TaskEvent, TaskEventType
from app.store import TASKS, TASK_EVENTS, load_seed_tasks

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
def list_tasks() -> list[Task]:
    load_seed_tasks()
    return list(TASKS.values())


@router.post("/ingest")
def ingest_tasks(payload: IngestRequest) -> dict[str, int | str]:
    for task in payload.tasks:
        if task.id not in TASKS:
            TASK_EVENTS.append(
                TaskEvent(
                    event_type=TaskEventType.TASK_CREATED,
                    task_id=task.id,
                    occurred_at=datetime.now(timezone.utc),
                    metadata={"course": task.course},
                )
            )
        TASKS[task.id] = task
    return {"source": payload.source, "ingested_count": len(payload.tasks)}

