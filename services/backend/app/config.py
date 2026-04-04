import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    ml_service_url: str = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
    auth_bypass: bool = os.getenv("AUTH_BYPASS", "true").lower() == "true"
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/connect/callback"
    )


settings = Settings()
