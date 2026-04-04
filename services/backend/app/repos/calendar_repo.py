from datetime import datetime
from typing import Any

from app.config import settings
from app.store import CALENDAR_CONNECTIONS

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


def get_connection(user_id: str, provider: str = "google") -> dict[str, Any] | None:
    client = _service_client()
    if client is None:
        record = CALENDAR_CONNECTIONS.get(f"{user_id}:{provider}")
        return None if record is None else dict(record)

    response = (
        client.table("calendar_connections")
        .select("*")
        .eq("user_id", user_id)
        .eq("provider", provider)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None

    row = response.data[0]
    return {
        "provider": row.get("provider", provider),
        "provider_user_email": row.get("provider_user_email"),
        "access_token": row.get("access_token_encrypted"),
        "refresh_token": row.get("refresh_token_encrypted"),
        "expires_at": row.get("expires_at"),
    }


def upsert_connection(
    user_id: str,
    *,
    provider_user_email: str | None,
    access_token: str,
    refresh_token: str,
    expires_at: datetime,
    provider: str = "google",
) -> dict[str, Any]:
    record = {
        "provider": provider,
        "provider_user_email": provider_user_email,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
    }

    client = _service_client()
    if client is None:
        CALENDAR_CONNECTIONS[f"{user_id}:{provider}"] = record
        return dict(record)

    client.table("calendar_connections").upsert(
        {
            "user_id": user_id,
            "provider": provider,
            "provider_user_email": provider_user_email,
            "access_token_encrypted": access_token,
            "refresh_token_encrypted": refresh_token,
            "expires_at": expires_at.isoformat(),
        },
        on_conflict="user_id,provider",
    ).execute()
    return dict(record)
