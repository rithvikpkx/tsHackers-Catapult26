from datetime import datetime, timezone

from app.config import settings
from app.models import Task, TaskStatus
from app.store import TASKS

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


def _row_to_task(row: dict) -> Task:
    return Task(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        course=row["course"],
        task_type=row.get("task_type"),
        course_snapshot=row.get("course_snapshot"),
        due_date=row["due_date"],
        estimated_effort_hours=row["estimated_effort_hours"],
        corrected_effort_hours=row.get("corrected_effort_hours"),
        course_risk_prior=row.get("course_risk_prior"),
        failure_risk=row.get("failure_risk"),
        risk_explanation=row.get("risk_explanation"),
        status=TaskStatus(row.get("status", "todo")),
        source=row.get("source", "manual_import"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def list_tasks(user_id: str) -> list[Task]:
    client = _service_client()
    if client is None:
        return [task for task in TASKS.values() if (task.user_id or user_id) == user_id]

    response = (
        client.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .order("due_date", desc=False)
        .execute()
    )
    return [_row_to_task(row) for row in response.data or []]


def upsert_tasks(user_id: str, tasks: list[Task], source: str | None = None) -> int:
    client = _service_client()
    now = datetime.now(timezone.utc)
    payload = []
    for task in tasks:
        task.user_id = user_id
        if source is not None:
            task.source = source
        task.updated_at = now
        if not task.created_at:
            task.created_at = now
        payload.append(
            {
                "id": task.id,
                "user_id": user_id,
                "title": task.title,
                "course": task.course,
                "task_type": task.task_type,
                "course_snapshot": task.course_snapshot,
                "due_date": task.due_date.isoformat(),
                "estimated_effort_hours": task.estimated_effort_hours,
                "corrected_effort_hours": task.corrected_effort_hours,
                "course_risk_prior": task.course_risk_prior,
                "failure_risk": task.failure_risk,
                "risk_explanation": task.risk_explanation,
                "status": task.status.value,
                "source": task.source,
                "created_at": task.created_at.isoformat(),
                "updated_at": now.isoformat(),
            }
        )

    if client is None:
        for task in tasks:
            TASKS[task.id] = task
        return len(tasks)

    client.table("tasks").upsert(payload, on_conflict="user_id,id").execute()
    return len(tasks)


def get_task_by_id(user_id: str, task_id: str) -> Task | None:
    client = _service_client()
    if client is None:
        task = TASKS.get(task_id)
        if task is None:
            return None
        if task.user_id and task.user_id != user_id:
            return None
        task.user_id = user_id
        return task

    response = (
        client.table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return _row_to_task(response.data[0])
