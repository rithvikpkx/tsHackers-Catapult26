from fastapi import APIRouter

from app.models import CalendarFocusBlockRequest

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.post("/focus-block")
def create_focus_block(payload: CalendarFocusBlockRequest) -> dict[str, str]:
    # Hook this to Google Calendar API as soon as OAuth is wired.
    return {
        "status": "stubbed",
        "message": "Focus block accepted for calendar write",
        "task_id": payload.task_id,
    }

