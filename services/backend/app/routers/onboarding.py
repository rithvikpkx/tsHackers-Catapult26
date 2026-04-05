from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.brightspace_pipeline import build_dashboard_from_brightspace
from app.models import BrightspaceImportRequest, BrightspaceImportResponse, TaskEvent, TaskEventType
from app.store import TASK_EVENTS, replace_tasks

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/brightspace-import", response_model=BrightspaceImportResponse)
def import_brightspace_calendar(payload: BrightspaceImportRequest) -> BrightspaceImportResponse:
    try:
        tasks, response = build_dashboard_from_brightspace(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    replace_tasks(tasks)

    TASK_EVENTS.clear()
    now = datetime.now(timezone.utc)
    for task in tasks:
        TASK_EVENTS.append(
            TaskEvent(
                event_type=TaskEventType.TASK_CREATED,
                task_id=task.id,
                occurred_at=now,
                metadata={"course": task.course, "source": "brightspace_icalendar"},
            )
        )

    return response
