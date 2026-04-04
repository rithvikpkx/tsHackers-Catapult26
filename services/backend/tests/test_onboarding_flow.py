from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.brightspace_ics import ParsedEvent
from app.store import CALENDAR_CONNECTIONS, TASK_EVENTS, TASKS


class OnboardingFlowTests(TestCase):
    def setUp(self) -> None:
        TASKS.clear()
        TASK_EVENTS.clear()
        CALENDAR_CONNECTIONS.clear()
        self.client = TestClient(app)

    def test_first_run_starts_empty(self) -> None:
        response = self.client.get("/api/tasks")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_google_connect_explains_missing_oauth_configuration(self) -> None:
        response = self.client.get("/api/calendar/connect/start")

        self.assertEqual(response.status_code, 503)
        self.assertIn("GOOGLE_CLIENT_ID", response.json()["detail"])

    def test_brightspace_import_creates_scored_tasks(self) -> None:
        mock_events = [
            ParsedEvent(
                summary="CS 250 Quiz 3",
                start=datetime(2026, 4, 10, 14, 0, tzinfo=timezone.utc),
                end=datetime(2026, 4, 10, 15, 0, tzinfo=timezone.utc),
                description="Timed quiz",
                categories="CS 250",
            )
        ]

        with patch("app.routers.calendar.fetch_and_parse_events", return_value=mock_events):
            response = self.client.post(
                "/api/calendar/brightspace/import",
                json={"feed_url": "https://example.com/feed.ics"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ingested_count"], 1)

        tasks = self.client.get("/api/tasks")
        self.assertEqual(tasks.status_code, 200)
        payload = tasks.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["source"], "brightspace_calendar_import")
        self.assertIsNotNone(payload[0]["corrected_effort_hours"])
        self.assertIsNotNone(payload[0]["course_risk_prior"])
        self.assertIsNotNone(payload[0]["failure_risk"])
        self.assertTrue(payload[0]["risk_explanation"])
