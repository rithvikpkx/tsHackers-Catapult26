from fastapi import APIRouter

from app.models import IngestRequest, Task
from app.store import TASKS

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
def list_tasks() -> list[Task]:
    return list(TASKS.values())


@router.post("/ingest")
def ingest_tasks(payload: IngestRequest) -> dict[str, int | str]:
    for task in payload.tasks:
        TASKS[task.id] = task
    return {"source": payload.source, "ingested_count": len(payload.tasks)}

