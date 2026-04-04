from fastapi import Depends, Header, HTTPException, status

from app.config import settings
from app.models import AuthContext

try:
    from supabase import Client, create_client
except Exception:  # pragma: no cover - optional until dependencies are installed
    Client = None
    create_client = None


def _supabase_client() -> "Client | None":
    if not settings.supabase_url or not settings.supabase_anon_key or create_client is None:
        return None
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_auth_context(authorization: str | None = Header(default=None)) -> AuthContext:
    if settings.auth_bypass:
        return AuthContext(
            user_id="00000000-0000-0000-0000-000000000001",
            email="dev@local",
        )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    client = _supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase auth not configured",
        )

    response = client.auth.get_user(token)
    user = getattr(response, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

    return AuthContext(user_id=str(user.id), email=getattr(user, "email", None))


AuthDep = Depends(get_auth_context)
