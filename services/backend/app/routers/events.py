from fastapi import APIRouter

from app.models import PersonalizationSignals, TaskEvent
from app.store import TASK_EVENTS, derive_personalization_signals

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[TaskEvent])
def list_events() -> list[TaskEvent]:
    return TASK_EVENTS


@router.post("", response_model=PersonalizationSignals)
def log_event(payload: TaskEvent) -> PersonalizationSignals:
    TASK_EVENTS.append(payload)
    return derive_personalization_signals()


@router.get("/signals", response_model=PersonalizationSignals)
def get_personalization_signals() -> PersonalizationSignals:
    return derive_personalization_signals()
