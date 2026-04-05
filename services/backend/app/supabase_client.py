import os
from typing import Any

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


def get_supabase_client() -> Any | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
