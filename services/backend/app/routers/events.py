from fastapi import APIRouter

from app.auth import AuthDep
from app.models import PersonalizationSignals, TaskEvent
from app.store import TASK_EVENTS, derive_personalization_signals

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[TaskEvent])
def list_events(auth=AuthDep) -> list[TaskEvent]:
    return [event for event in TASK_EVENTS if event.metadata.get("user_id") in (None, auth.user_id)]


@router.post("", response_model=PersonalizationSignals)
def log_event(payload: TaskEvent, auth=AuthDep) -> PersonalizationSignals:
    payload.metadata["user_id"] = auth.user_id
    TASK_EVENTS.append(payload)
    return derive_personalization_signals(auth.user_id)


@router.get("/signals", response_model=PersonalizationSignals)
def get_personalization_signals(auth=AuthDep) -> PersonalizationSignals:
    return derive_personalization_signals(auth.user_id)
