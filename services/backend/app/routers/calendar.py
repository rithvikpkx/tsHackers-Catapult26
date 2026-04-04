from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.auth import AuthDep
from app.config import settings
from app.models import (
    CalendarConnectionStatus,
    CalendarFocusBlockRequest,
    CalendarSyncResponse,
    TaskEvent,
    TaskEventType,
)
from app.repos.calendar_repo import get_connection, upsert_connection
from app.repos.events_repo import append_event
from app.services.google_calendar import (
    GoogleCalendarError,
    create_focus_block as create_google_focus_block,
    exchange_code_for_tokens,
    list_upcoming_events,
    refresh_access_token,
)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])
_OAUTH_STATES: dict[str, str] = {}


def _parse_datetime(value: datetime | str | None) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _status_payload(user_id: str) -> CalendarConnectionStatus:
    connection = get_connection(user_id)
    if connection is None:
        return CalendarConnectionStatus()

    expires_at = _parse_datetime(connection.get("expires_at"))
    return CalendarConnectionStatus(
        connected=True,
        provider=connection.get("provider", "google"),
        provider_user_email=connection.get("provider_user_email"),
        expires_at=expires_at,
        has_refresh_token=bool(connection.get("refresh_token")),
    )


def _ensure_valid_connection(user_id: str) -> dict:
    connection = get_connection(user_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="Google Calendar is not connected")

    expires_at = _parse_datetime(connection.get("expires_at"))
    if expires_at is None:
        raise HTTPException(status_code=503, detail="Calendar token expiry is missing")

    if expires_at <= datetime.now(timezone.utc) + timedelta(minutes=2):
        refresh_token = str(connection.get("refresh_token") or "")
        if not refresh_token:
            raise HTTPException(status_code=401, detail="Google Calendar connection expired")
        try:
            refreshed = refresh_access_token(refresh_token)
        except (GoogleCalendarError, httpx.HTTPError) as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        connection = upsert_connection(
            user_id,
            provider_user_email=connection.get("provider_user_email"),
            access_token=str(refreshed["access_token"]),
            refresh_token=refresh_token,
            expires_at=refreshed["expires_at"],
        )
        connection["expires_at"] = refreshed["expires_at"]
    else:
        connection["expires_at"] = expires_at

    return connection


@router.get("/status", response_model=CalendarConnectionStatus)
def calendar_status(auth=AuthDep) -> CalendarConnectionStatus:
    return _status_payload(auth.user_id)


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
            "scope": "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    return {"auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/connect/callback")
def oauth_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        return RedirectResponse(f"{settings.frontend_url}?calendar=error")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    if state not in _OAUTH_STATES:
        raise HTTPException(status_code=400, detail="Invalid oauth state")

    user_id = _OAUTH_STATES.pop(state)
    existing = get_connection(user_id)
    try:
        token_payload = exchange_code_for_tokens(code)
    except (GoogleCalendarError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    refresh_token = str(token_payload.get("refresh_token") or "")
    if not refresh_token and existing is not None:
        refresh_token = str(existing.get("refresh_token") or "")

    upsert_connection(
        user_id,
        provider_user_email=token_payload.get("provider_user_email"),
        access_token=str(token_payload["access_token"]),
        refresh_token=refresh_token,
        expires_at=token_payload["expires_at"],
    )
    return RedirectResponse(f"{settings.frontend_url}?calendar=connected")


@router.get("/schedule", response_model=CalendarSyncResponse)
def read_calendar_schedule(
    days: int = Query(default=7, ge=1, le=14),
    auth=AuthDep,
) -> CalendarSyncResponse:
    window_start = datetime.now(timezone.utc)
    window_end = window_start + timedelta(days=days)
    status = _status_payload(auth.user_id)
    if not status.connected:
        return CalendarSyncResponse(status=status, window_start=window_start, window_end=window_end, blocks=[])

    try:
        connection = _ensure_valid_connection(auth.user_id)
        blocks = list_upcoming_events(
            str(connection["access_token"]),
            time_min=window_start,
            time_max=window_end,
        )
    except (GoogleCalendarError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return CalendarSyncResponse(
        status=_status_payload(auth.user_id),
        window_start=window_start,
        window_end=window_end,
        blocks=blocks,
    )


@router.post("/focus-block")
def create_focus_block(payload: CalendarFocusBlockRequest, auth=AuthDep) -> dict[str, str]:
    connection = _ensure_valid_connection(auth.user_id)
    try:
        created = create_google_focus_block(str(connection["access_token"]), payload)
    except (GoogleCalendarError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    append_event(
        auth.user_id,
        TaskEvent(
            event_type=TaskEventType.FOCUS_BLOCK_ACCEPTED,
            task_id=payload.task_id,
            occurred_at=datetime.now(timezone.utc),
            metadata={
                "calendar_event_id": created["event_id"],
                "calendar_url": created["html_link"],
                "provider": "google",
            },
        ),
    )
    return created
