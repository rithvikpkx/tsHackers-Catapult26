from fastapi import APIRouter

from app.models import CalendarBlock, CalendarBlocksRequest, CalendarFocusBlockRequest
from app.store import store_calendar_blocks

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.post("/focus-block")
def create_focus_block(payload: CalendarFocusBlockRequest) -> dict[str, str]:
    # Hook this to Google Calendar API as soon as OAuth is wired.
    return {
        "status": "stubbed",
        "message": "Focus block accepted for calendar write",
        "task_id": payload.task_id,
    }


@router.post("/blocks")
def ingest_calendar_blocks(payload: CalendarBlocksRequest) -> dict[str, int]:
    if payload.blocks:
        store_calendar_blocks(payload.blocks)
    return {"ingested_blocks": len(payload.blocks)}

