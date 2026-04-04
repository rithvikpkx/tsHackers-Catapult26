from secrets import token_urlsafe
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException

from app.auth import AuthDep
from app.config import settings

from app.models import CalendarFocusBlockRequest

router = APIRouter(prefix="/api/calendar", tags=["calendar"])
_OAUTH_STATES: dict[str, str] = {}


@router.get("/connect/start")
def start_google_oauth(auth=AuthDep) -> dict[str, str]:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth client id is not configured")

    state = token_urlsafe(24)
    _OAUTH_STATES[state] = auth.user_id
    params = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile https://www.googleapis.com/auth/calendar.events",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    return {"auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/connect/callback")
def oauth_callback(code: str | None = None, state: str | None = None) -> dict[str, str]:
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    if state not in _OAUTH_STATES:
        raise HTTPException(status_code=400, detail="Invalid oauth state")
    # Token exchange + secure persistence will be enabled once Supabase credentials are configured.
    return {"status": "pending_setup", "message": "OAuth callback validated; token exchange not wired yet"}


@router.post("/focus-block")
def create_focus_block(payload: CalendarFocusBlockRequest, auth=AuthDep) -> dict[str, str]:
    # Hook this to Google Calendar API as soon as OAuth is wired.
    return {
        "status": "stubbed",
        "message": "Focus block accepted for calendar write",
        "task_id": payload.task_id,
        "user_id": auth.user_id,
    }
