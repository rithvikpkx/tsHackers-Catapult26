from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings
from app.models import CalendarFocusBlockRequest, ScheduleBlock

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


class GoogleCalendarError(RuntimeError):
    pass


def exchange_code_for_tokens(code: str) -> dict[str, str | datetime | None]:
    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleCalendarError("Google OAuth client credentials are not configured")

    with httpx.Client(timeout=10.0) as client:
        token_response = client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_response.raise_for_status()
        token_payload = token_response.json()

        access_token = token_payload["access_token"]
        userinfo_response = client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_response.raise_for_status()
        userinfo_payload = userinfo_response.json()

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(token_payload.get("expires_in", 3600)))
    return {
        "access_token": access_token,
        "refresh_token": token_payload.get("refresh_token", ""),
        "expires_at": expires_at,
        "provider_user_email": userinfo_payload.get("email"),
    }


def refresh_access_token(refresh_token: str) -> dict[str, str | datetime]:
    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleCalendarError("Google OAuth client credentials are not configured")
    if not refresh_token:
        raise GoogleCalendarError("No Google refresh token is stored for this user")

    with httpx.Client(timeout=10.0) as client:
        token_response = client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        token_response.raise_for_status()
        token_payload = token_response.json()

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(token_payload.get("expires_in", 3600)))
    return {
        "access_token": token_payload["access_token"],
        "expires_at": expires_at,
    }


def list_upcoming_events(
    access_token: str,
    *,
    time_min: datetime,
    time_max: datetime,
) -> list[ScheduleBlock]:
    with httpx.Client(timeout=10.0) as client:
        response = client.get(
            GOOGLE_EVENTS_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "timeMin": time_min.astimezone(timezone.utc).isoformat(),
                "timeMax": time_max.astimezone(timezone.utc).isoformat(),
                "singleEvents": "true",
                "orderBy": "startTime",
            },
        )
        response.raise_for_status()
        payload = response.json()

    blocks: list[ScheduleBlock] = []
    for item in payload.get("items", []):
        if item.get("status") == "cancelled":
            continue
        start_value = item.get("start", {}).get("dateTime") or item.get("start", {}).get("date")
        end_value = item.get("end", {}).get("dateTime") or item.get("end", {}).get("date")
        if not start_value or not end_value:
            continue

        if "T" in start_value:
            start = datetime.fromisoformat(start_value.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_value.replace("Z", "+00:00"))
        else:
            start = datetime.fromisoformat(f"{start_value}T00:00:00+00:00")
            end = datetime.fromisoformat(f"{end_value}T00:00:00+00:00")

        blocks.append(
            ScheduleBlock(
                start=start,
                end=end,
                label=item.get("summary") or "Busy",
            )
        )

    return blocks


def create_focus_block(access_token: str, payload: CalendarFocusBlockRequest) -> dict[str, str]:
    with httpx.Client(timeout=10.0) as client:
        response = client.post(
            GOOGLE_EVENTS_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "summary": payload.title,
                "description": f"Scheduled by Grind for task {payload.task_id}",
                "start": {
                    "dateTime": payload.start.isoformat(),
                    "timeZone": payload.timezone,
                },
                "end": {
                    "dateTime": payload.end.isoformat(),
                    "timeZone": payload.timezone,
                },
            },
        )
        response.raise_for_status()
        created = response.json()

    return {
        "event_id": created.get("id", ""),
        "html_link": created.get("htmlLink", ""),
        "status": created.get("status", "confirmed"),
    }
