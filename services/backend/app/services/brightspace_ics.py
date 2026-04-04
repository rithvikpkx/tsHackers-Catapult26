from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timezone
import hashlib
import re

import httpx

from app.models import Task


class BrightspaceImportError(RuntimeError):
    pass


@dataclass
class ParsedEvent:
    summary: str
    start: datetime
    end: datetime
    description: str = ""
    categories: str = ""


def fetch_and_parse_events(feed_url: str) -> list[ParsedEvent]:
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        response = client.get(feed_url)
        response.raise_for_status()
    return parse_ics_events(response.text)


def parse_ics_events(payload: str) -> list[ParsedEvent]:
    events: list[ParsedEvent] = []
    current: dict[str, str] | None = None

    for line in _unfold_lines(payload):
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT":
            if current is not None:
                events.append(_event_from_map(current))
            current = None
            continue
        if current is None or ":" not in line:
            continue

        raw_key, value = line.split(":", 1)
        key = raw_key.split(";", 1)[0]
        current[key] = value

    return events


def events_to_tasks(events: list[ParsedEvent]) -> list[Task]:
    tasks: list[Task] = []
    for event in events:
        title = event.summary or "Brightspace task"
        course = _infer_course(title, event.description, event.categories)
        task_type = _infer_task_type(title, event.description)
        due_date = event.end if event.end > event.start else event.start
        estimated_effort_hours = _estimate_effort(task_type, title)

        digest = hashlib.sha1(f"{title}|{due_date.isoformat()}|{course}".encode("utf-8")).hexdigest()[:12]
        tasks.append(
            Task(
                id=f"brightspace-{digest}",
                title=title,
                course=course,
                task_type=task_type,
                due_date=due_date,
                estimated_effort_hours=estimated_effort_hours,
                source="brightspace_calendar_import",
            )
        )
    return tasks


def _unfold_lines(payload: str) -> list[str]:
    raw_lines = payload.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    unfolded: list[str] = []
    for line in raw_lines:
        if not line:
            continue
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)
    return unfolded


def _event_from_map(values: dict[str, str]) -> ParsedEvent:
    summary = _unescape(values.get("SUMMARY", "Brightspace task"))
    description = _unescape(values.get("DESCRIPTION", ""))
    categories = _unescape(values.get("CATEGORIES", ""))
    if "DTSTART" not in values:
        raise BrightspaceImportError("Brightspace feed event is missing DTSTART")

    start = _parse_ics_datetime(values["DTSTART"])
    end = _parse_ics_datetime(values.get("DTEND", values["DTSTART"]), end_of_day=True)
    return ParsedEvent(summary=summary, start=start, end=end, description=description, categories=categories)


def _parse_ics_datetime(value: str, end_of_day: bool = False) -> datetime:
    value = value.strip()
    if len(value) == 8 and value.isdigit():
        date_value = datetime.strptime(value, "%Y%m%d").date()
        base_time = time(23, 59, tzinfo=timezone.utc) if end_of_day else time(0, 0, tzinfo=timezone.utc)
        return datetime.combine(date_value, base_time)

    if value.endswith("Z"):
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)

    try:
        parsed = datetime.strptime(value, "%Y%m%dT%H%M%S")
    except ValueError as exc:
        raise BrightspaceImportError(f"Unsupported ICS datetime value '{value}'") from exc
    return parsed.replace(tzinfo=timezone.utc)


def _infer_course(summary: str, description: str, categories: str) -> str:
    if categories.strip():
        return categories.strip()

    for candidate in (description, summary):
        match = re.search(r"([A-Z]{2,5}\s?\d{2,4})", candidate)
        if match:
            return match.group(1).replace("  ", " ").strip()

    if " - " in summary:
        suffix = summary.rsplit(" - ", 1)[-1].strip()
        if suffix:
            return suffix

    return "Brightspace"


def _infer_task_type(summary: str, description: str) -> str:
    text = f"{summary} {description}".lower()
    if "quiz" in text or "exam" in text:
        return "quiz"
    if "discussion" in text or "reading" in text or "response" in text:
        return "reading"
    if "project" in text:
        return "project"
    if "problem set" in text or "pset" in text:
        return "problem_set"
    return "assignment"


def _estimate_effort(task_type: str, title: str) -> float:
    lowered = title.lower()
    if task_type == "quiz":
        return 1.5
    if task_type == "reading":
        return 1.0
    if task_type == "project":
        return 4.0
    if "lab" in lowered:
        return 2.5
    return 2.0


def _unescape(value: str) -> str:
    return (
        value.replace("\\n", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .strip()
    )
