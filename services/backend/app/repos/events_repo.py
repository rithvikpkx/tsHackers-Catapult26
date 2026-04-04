from app.config import settings
from app.models import TaskEvent, TaskEventType
from app.store import TASK_EVENTS

try:
    from supabase import Client, create_client
except Exception:  # pragma: no cover - optional until dependencies are installed
    Client = None
    create_client = None


def _service_client() -> "Client | None":
    if settings.auth_bypass:
        return None
    if not settings.supabase_url or not settings.supabase_service_role_key or create_client is None:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _row_to_event(row: dict) -> TaskEvent:
    return TaskEvent(
        event_type=TaskEventType(row["event_type"]),
        task_id=row["task_id"],
        occurred_at=row["occurred_at"],
        metadata=row.get("metadata") or {},
    )


def list_events(user_id: str) -> list[TaskEvent]:
    client = _service_client()
    if client is None:
        return [event for event in TASK_EVENTS if event.metadata.get("user_id") in (None, user_id)]

    response = (
        client.table("task_events")
        .select("task_id,event_type,occurred_at,metadata")
        .eq("user_id", user_id)
        .order("occurred_at", desc=False)
        .execute()
    )
    return [_row_to_event(row) for row in response.data or []]


def append_event(user_id: str, event: TaskEvent) -> TaskEvent:
    event.metadata["user_id"] = user_id
    client = _service_client()
    if client is None:
        TASK_EVENTS.append(event)
        return event

    client.table("task_events").insert(
        {
            "user_id": user_id,
            "task_id": event.task_id,
            "event_type": event.event_type.value,
            "occurred_at": event.occurred_at.isoformat(),
            "metadata": event.metadata,
        }
    ).execute()
    return event
