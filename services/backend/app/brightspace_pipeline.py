from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models import (
    BrightspaceImportRequest,
    BrightspaceImportResponse,
    DashboardIntervention,
    DashboardMetrics,
    DashboardTask,
    Task,
    TaskStatus,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from builder_c.starter.data_loader import PersonalizationSignals, StudentCourseSnapshot, TaskInput, clamp  # noqa: E402
from builder_c.starter.explanations import build_course_prior_explanation, build_task_risk_explanation  # noqa: E402
from builder_c.starter.task_risk import risk_bucket, score_task_risk  # noqa: E402
from builder_c.starter.train_models import ensure_bundle  # noqa: E402

COURSE_PATTERN = re.compile(r"\b([A-Z]{2,4}\s?-?\d{3}[A-Z]?)\b")
MODULE_CODES = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"]
TASK_TYPE_BY_KEYWORD = {
    "quiz": "quiz",
    "exam": "quiz",
    "midterm": "quiz",
    "final": "quiz",
    "lab": "lab",
    "essay": "essay",
    "paper": "essay",
    "report": "essay",
    "response": "essay",
    "project": "project",
    "milestone": "project",
    "reading": "reading",
    "read": "reading",
    "chapter": "reading",
}
BASE_EFFORT_HOURS = {
    "problem_set": 3.0,
    "project": 6.0,
    "essay": 4.0,
    "reading": 1.5,
    "lab": 2.5,
    "quiz": 1.75,
}
HIGHER_EDUCATION_BY_GRADE = {
    "freshman": "A Level or Equivalent",
    "sophomore": "HE Qualification",
    "junior": "HE Qualification",
    "senior": "HE Qualification",
    "grad": "Post Graduate Qualification",
}
GRADE_PRESSURE = {
    "freshman": 0.00,
    "sophomore": 0.03,
    "junior": 0.05,
    "senior": 0.07,
    "grad": 0.10,
}
WEEKDAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
MODEL_LOOKBACK_DAYS = 30
IMPORT_LIMIT = 20


@dataclass
class ParsedCalendarEvent:
    uid: str
    summary: str
    description: str
    due: datetime
    start: datetime
    course: str


def build_dashboard_from_brightspace(payload: BrightspaceImportRequest) -> tuple[list[Task], BrightspaceImportResponse]:
    now = datetime.now(timezone.utc)
    ical_text = _download_calendar(payload.brightspace_calendar_url)
    parsed_events = _parse_ical_events(ical_text)
    relevant_events = [event for event in parsed_events if event.due >= now - timedelta(days=MODEL_LOOKBACK_DAYS)]
    relevant_events.sort(key=lambda event: event.due)

    if not relevant_events:
        raise ValueError("No recent or upcoming calendar events were found in the Brightspace iCalendar feed.")

    selected_events = relevant_events[:IMPORT_LIMIT]
    personalization = _derive_personalization(selected_events, payload.grade_year, now)
    initial_distortion_multiplier = _estimate_distortion_multiplier(selected_events, personalization)
    bundle = ensure_bundle()
    snapshots = _build_course_snapshots(selected_events, payload.grade_year, now)

    seen_task_ids: set[str] = set()
    scored_tasks: list[Task] = []
    for index, event in enumerate(selected_events, start=1):
        task_type = _infer_task_type(event.summary, event.description)
        estimate_hours = _estimate_effort_hours(task_type, event.summary)
        hours_until_due = max((event.due - now).total_seconds() / 3600.0, 0.0)
        start_delay_hours = _estimate_start_delay_hours(hours_until_due, personalization)
        corrected_effort_hours = round(estimate_hours * initial_distortion_multiplier + start_delay_hours * 0.08, 2)
        status = _status_for_due_date(event.due, now)

        snapshot = snapshots[event.course]
        course_risk_prior = bundle.predict_course_risk_prior(snapshot)
        task_input = TaskInput(
            task_id=_make_task_id(event, index),
            title=event.summary,
            course=event.course,
            task_type=task_type,
            estimate_hours=estimate_hours,
            corrected_effort_hours=corrected_effort_hours,
            hours_until_due=hours_until_due,
            start_delay_hours=start_delay_hours,
            status=status.value,
            course_risk_prior=course_risk_prior,
        )

        failure_risk, drivers = score_task_risk(task_input, personalization)
        course_context = build_course_prior_explanation(snapshot, course_risk_prior, bundle.thresholds)
        risk_explanation = build_task_risk_explanation(
            task_input,
            failure_risk,
            drivers,
            personalization,
            course_context,
        )

        task_id = task_input.task_id
        unique_counter = 2
        while task_id in seen_task_ids:
            task_id = f"{task_input.task_id}-{unique_counter}"
            unique_counter += 1
        seen_task_ids.add(task_id)

        scored_tasks.append(
            Task(
                id=task_id,
                title=event.summary,
                course=event.course,
                due_date=event.due,
                estimated_effort_hours=round(estimate_hours, 2),
                corrected_effort_hours=corrected_effort_hours,
                course_risk_prior=course_risk_prior,
                failure_risk=failure_risk,
                risk_explanation=risk_explanation,
                status=status,
            )
        )

    scored_tasks.sort(key=lambda item: (-(item.failure_risk or 0.0), item.due_date))
    distortion_multiplier = _realized_distortion_multiplier(scored_tasks, initial_distortion_multiplier)
    visible_tasks = [task for task in scored_tasks if task.due_date >= now]
    frontend_tasks = [_to_dashboard_task(task, now) for task in visible_tasks[:8]]
    metrics = _build_metrics(scored_tasks, distortion_multiplier, now)
    resting_rate = _build_resting_rate(scored_tasks, personalization)
    distortion_profile = _build_distortion_profile(selected_events, personalization, distortion_multiplier, scored_tasks)
    intervention = _build_intervention(visible_tasks, now)
    summary = _build_summary(metrics.atRiskCount, metrics.healthLabel)

    response = BrightspaceImportResponse(
        source="brightspace_icalendar",
        importedCount=len(scored_tasks),
        summary=summary,
        restingRate=resting_rate,
        tasks=frontend_tasks,
        distortion=distortion_profile,
        metrics=metrics,
        intervention=intervention,
    )
    return scored_tasks, response


def _download_calendar(url: str) -> str:
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    if scheme not in {"https", "http", "webcal"}:
        raise ValueError("Brightspace calendar URL must start with https://, http://, or webcal://.")

    normalized_url = url
    if scheme == "webcal":
        normalized_url = url.replace("webcal://", "https://", 1)

    request = Request(normalized_url, headers={"User-Agent": "grind-backend/0.2"})
    try:
        with urlopen(request, timeout=12) as response:
            body = response.read()
    except HTTPError as exc:
        if exc.code in {401, 403}:
            raise ValueError(
                "Brightspace rejected the iCalendar link (401/403). Generate a fresh feed URL/token and try again."
            ) from exc
        if exc.code == 404:
            raise ValueError("Brightspace returned 404 for this iCalendar URL. Please verify the full feed link.") from exc
        raise ValueError(f"Brightspace returned HTTP {exc.code} while fetching the iCalendar feed.") from exc
    except URLError as exc:
        reason = str(exc.reason)
        if "10061" in reason or "Connection refused" in reason:
            raise ValueError(
                "Backend cannot reach external calendar hosts from this runtime environment. "
                "If the URL downloads in your browser, run the backend with outbound network access."
            ) from exc
        if "CERTIFICATE_VERIFY_FAILED" in reason:
            raise ValueError(
                "TLS certificate verification failed while reaching Brightspace. "
                "Check local SSL trust settings and try again."
            ) from exc
        raise ValueError("Unable to reach the Brightspace iCalendar link. Please verify the URL.") from exc

    try:
        text = body.decode("utf-8")
    except UnicodeDecodeError:
        text = body.decode("latin-1")

    if "BEGIN:VCALENDAR" not in text.upper():
        raise ValueError("The provided URL did not return a valid iCalendar feed.")
    return text


def _parse_ical_events(ical_text: str) -> list[ParsedCalendarEvent]:
    lines = _unfold_lines(ical_text)
    events: list[ParsedCalendarEvent] = []
    current: dict[str, tuple[str, dict[str, str]]] | None = None

    for line in lines:
        upper_line = line.upper()
        if upper_line == "BEGIN:VEVENT":
            current = {}
            continue
        if upper_line == "END:VEVENT":
            if current:
                event = _event_from_properties(current)
                if event is not None:
                    events.append(event)
            current = None
            continue
        if current is None or ":" not in line:
            continue

        raw_key, raw_value = line.split(":", 1)
        prop, params = _parse_property(raw_key)
        if prop not in current:
            current[prop] = (raw_value.strip(), params)

    return events


def _unfold_lines(ical_text: str) -> list[str]:
    unfolded: list[str] = []
    for raw_line in ical_text.splitlines():
        line = raw_line.rstrip("\r")
        if not line:
            continue
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)
    return unfolded


def _parse_property(raw_key: str) -> tuple[str, dict[str, str]]:
    chunks = raw_key.split(";")
    prop = chunks[0].strip().upper()
    params: dict[str, str] = {}
    for chunk in chunks[1:]:
        if "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        params[key.strip().upper()] = value.strip()
    return prop, params


def _event_from_properties(props: dict[str, tuple[str, dict[str, str]]]) -> ParsedCalendarEvent | None:
    summary_value = props.get("SUMMARY", ("", {}))[0]
    summary = _unescape_ical_text(summary_value).strip()
    if not summary:
        return None

    due = _read_datetime(props.get("DUE")) or _read_datetime(props.get("DTEND")) or _read_datetime(props.get("DTSTART"))
    if due is None:
        return None
    start = _read_datetime(props.get("DTSTART")) or due

    description = _unescape_ical_text(props.get("DESCRIPTION", ("", {}))[0]).strip()
    categories = _unescape_ical_text(props.get("CATEGORIES", ("", {}))[0]).strip()
    course = _extract_course(summary, description, categories)
    uid = props.get("UID", (f"{course}-{summary}", {}))[0]
    return ParsedCalendarEvent(uid=uid, summary=summary, description=description, due=due, start=start, course=course)


def _unescape_ical_text(value: str) -> str:
    return (
        value.replace("\\n", " ")
        .replace("\\N", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
    )


def _read_datetime(raw_prop: tuple[str, dict[str, str]] | None) -> datetime | None:
    if raw_prop is None:
        return None
    raw_value, params = raw_prop
    text = raw_value.strip()
    if not text:
        return None

    tzinfo = timezone.utc
    tzid = params.get("TZID")
    if tzid:
        try:
            tzinfo = ZoneInfo(tzid.strip('"'))
        except ZoneInfoNotFoundError:
            tzinfo = timezone.utc

    if params.get("VALUE", "").upper() == "DATE" or (len(text) == 8 and text.isdigit()):
        try:
            day = datetime.strptime(text[:8], "%Y%m%d")
        except ValueError:
            return None
        return day.replace(hour=23, minute=59, tzinfo=tzinfo).astimezone(timezone.utc)

    if text.endswith("Z"):
        for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%dT%H%MZ"):
            try:
                parsed = datetime.strptime(text, fmt)
                return parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    for fmt in ("%Y%m%dT%H%M%S", "%Y%m%dT%H%M"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.replace(tzinfo=tzinfo).astimezone(timezone.utc)
        except ValueError:
            continue
    return None


def _extract_course(summary: str, description: str, categories: str) -> str:
    for text in (summary, categories, description):
        match = COURSE_PATTERN.search(text.upper())
        if match:
            return _normalize_course(match.group(1))
    if ":" in summary:
        prefix = summary.split(":", 1)[0].strip()
        if 2 <= len(prefix) <= 18:
            return prefix
    return "General Studies"


def _normalize_course(course: str) -> str:
    token = course.replace("-", " ").strip()
    match = re.match(r"^([A-Z]{2,4})\s?(\d{3}[A-Z]?)$", token)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    if " " in token:
        compact = [chunk for chunk in token.split() if chunk]
        if len(compact) >= 2:
            return f"{compact[0]} {compact[1]}"
    return token


def _infer_task_type(summary: str, description: str) -> str:
    text = f"{summary} {description}".lower()
    for keyword, task_type in TASK_TYPE_BY_KEYWORD.items():
        if keyword in text:
            return task_type
    return "problem_set"


def _estimate_effort_hours(task_type: str, summary: str) -> float:
    effort = BASE_EFFORT_HOURS.get(task_type, BASE_EFFORT_HOURS["problem_set"])
    lower = summary.lower()
    if "final" in lower or "midterm" in lower:
        effort += 1.5
    if "project" in lower and task_type != "project":
        effort += 1.0
    if "group" in lower:
        effort += 0.5
    return round(clamp(effort, 0.5, 12.0), 2)


def _derive_personalization(events: list[ParsedCalendarEvent], grade_year: str, now: datetime) -> PersonalizationSignals:
    overdue_count = sum(1 for event in events if event.due < now)
    due_soon_count = sum(1 for event in events if 0.0 <= (event.due - now).total_seconds() / 3600.0 <= 48.0)
    distinct_days = len({event.due.date() for event in events}) or 1
    congestion = clamp(len(events) / distinct_days - 1.0, 0.0, 3.5)
    grade_key = grade_year.lower().strip()
    pressure = GRADE_PRESSURE.get(grade_key, 0.05)

    recent_completion_rate = clamp(0.86 - overdue_count * 0.09 - due_soon_count * 0.05 - congestion * 0.04 - pressure, 0.3, 0.95)
    start_lag_hours = clamp(9.0 + due_soon_count * 6.5 + overdue_count * 10.0 + congestion * 5.0 + pressure * 24.0, 4.0, 72.0)
    focus_accept_rate = clamp(0.9 - overdue_count * 0.08 - congestion * 0.05, 0.3, 0.95)
    focus_completion_rate = clamp(focus_accept_rate - 0.09 - max(0, due_soon_count - 1) * 0.03, 0.25, 0.9)

    return PersonalizationSignals(
        recent_completion_rate=round(recent_completion_rate, 2),
        recent_overdue_count=float(overdue_count),
        start_lag_hours=round(start_lag_hours, 1),
        focus_block_accept_rate=round(focus_accept_rate, 2),
        focus_block_completion_rate=round(focus_completion_rate, 2),
    )


def _estimate_distortion_multiplier(events: list[ParsedCalendarEvent], personalization: PersonalizationSignals) -> float:
    if not events:
        return 1.2
    coding_like = sum(1 for event in events if _infer_task_type(event.summary, event.description) in {"problem_set", "project", "lab"})
    coding_ratio = coding_like / len(events)
    multiplier = clamp(
        1.18 + coding_ratio * 1.0 + personalization.start_lag_hours / 90.0 + personalization.recent_overdue_count * 0.08,
        1.1,
        2.9,
    )
    return round(multiplier, 1)


def _realized_distortion_multiplier(tasks: list[Task], fallback_multiplier: float) -> float:
    if not tasks:
        return round(fallback_multiplier, 1)

    ratios: list[float] = []
    for task in tasks:
        estimate = max(task.estimated_effort_hours, 0.25)
        corrected = task.corrected_effort_hours or estimate
        ratios.append(corrected / estimate)

    realized = clamp(sum(ratios) / len(ratios), 1.0, 3.2)
    blended = 0.7 * realized + 0.3 * fallback_multiplier
    return round(clamp(blended, 1.0, 3.2), 1)


def _build_course_snapshots(
    events: list[ParsedCalendarEvent],
    grade_year: str,
    now: datetime,
) -> dict[str, StudentCourseSnapshot]:
    course_events: dict[str, list[ParsedCalendarEvent]] = defaultdict(list)
    for event in events:
        course_events[event.course].append(event)

    studied_credits = clamp(float(max(len(course_events), 1) * 15), 30.0, 120.0)
    highest_education = HIGHER_EDUCATION_BY_GRADE.get(grade_year.lower().strip(), "HE Qualification")
    code_presentation = "2014B" if now.month <= 6 else "2014J"

    snapshots: dict[str, StudentCourseSnapshot] = {}
    for course, values in course_events.items():
        due_soon = sum(1 for event in values if 0.0 <= (event.due - now).total_seconds() / 3600.0 <= 72.0)
        overdue = sum(1 for event in values if event.due < now)
        load = len(values)
        score_drop = due_soon * 7.5 + overdue * 14.0 + max(load - 3, 0) * 2.0
        weighted_score_pct_30d = clamp(76.0 - score_drop, 12.0, 95.0)
        assessment_mean_score_30d = clamp(weighted_score_pct_30d + 4.0, 20.0, 97.0)
        active_days_30d = clamp(16.0 - due_soon * 1.3 - overdue * 2.2, 4.0, 22.0)
        total_clicks_30d = clamp(280.0 - due_soon * 18.0 - overdue * 28.0 + load * 22.0, 35.0, 900.0)
        unique_sites_30d = clamp(22.0 + load * 2.0 - due_soon * 1.2, 8.0, 60.0)
        unique_activity_types_30d = clamp(6.0 + min(load, 4), 3.0, 11.0)
        assessments_due_30d = float(max(load, 1))
        assessments_submitted_30d = float(max(load - overdue, 0))
        clicks_quiz = 36.0 if any(_infer_task_type(event.summary, event.description) == "quiz" for event in values) else 12.0

        snapshots[course] = StudentCourseSnapshot(
            code_module=_module_for_course(course),
            code_presentation=code_presentation,
            highest_education=highest_education,
            age_band="0-35",
            imd_band="50-60%",
            studied_credits=studied_credits,
            num_of_prev_attempts=1.0 if grade_year.lower().strip() in {"senior", "grad"} and due_soon + overdue >= 2 else 0.0,
            disability="N",
            gender="M",
            days_registered_before_start=72.0,
            module_presentation_length=262.0,
            unregistered_by_day_30=0.0 if overdue < 3 else 1.0,
            day_of_unregistration_capped=31.0 if overdue < 3 else 20.0,
            assessments_due_30d=assessments_due_30d,
            assessments_submitted_30d=assessments_submitted_30d,
            assessment_mean_score_30d=assessment_mean_score_30d,
            weighted_score_pct_30d=weighted_score_pct_30d,
            missing_submissions_30d=float(overdue),
            late_submissions_30d=float(max(due_soon - 1, 0)),
            total_clicks_30d=total_clicks_30d,
            active_days_30d=active_days_30d,
            unique_sites_30d=unique_sites_30d,
            unique_activity_types_30d=unique_activity_types_30d,
            pre_start_clicks=48.0,
            post_start_clicks=max(total_clicks_30d - 48.0, 0.0),
            clicks_resource=18.0 + load * 4.0,
            clicks_oucontent=64.0 + load * 7.0,
            clicks_subpage=30.0 + load * 5.0,
            clicks_url=8.0 + load * 2.0,
            clicks_forumng=42.0 + load * 6.0,
            clicks_quiz=clicks_quiz,
        )
    return snapshots


def _module_for_course(course: str) -> str:
    index = sum(ord(char) for char in course) % len(MODULE_CODES)
    return MODULE_CODES[index]


def _estimate_start_delay_hours(hours_until_due: float, personalization: PersonalizationSignals) -> float:
    urgency_pressure = clamp((48.0 - hours_until_due) / 48.0, 0.0, 1.0)
    delay = personalization.start_lag_hours * (0.45 + urgency_pressure * 0.35)
    return round(clamp(delay, 0.0, 96.0), 1)


def _status_for_due_date(due_date: datetime, now: datetime) -> TaskStatus:
    hours = (due_date - now).total_seconds() / 3600.0
    if hours < 0:
        return TaskStatus.BLOCKED
    if hours <= 24:
        return TaskStatus.IN_PROGRESS
    return TaskStatus.TODO


def _make_task_id(event: ParsedCalendarEvent, index: int) -> str:
    slug_source = f"{event.course}-{event.summary}".lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug_source).strip("-")
    if not slug:
        slug = f"task-{index}"
    return f"{slug}-{event.due.strftime('%m%d%H%M')}"


def _to_dashboard_task(task: Task, now: datetime) -> DashboardTask:
    risk = task.failure_risk or 0.0
    bucket = risk_bucket(risk)
    bucket_title = {"high": "Critical", "medium": "Risk building", "low": "Ready"}[bucket]
    due_phrase = _format_due_phrase(task.due_date, now)
    label = f"{int(round(risk * 100))}%" if bucket != "low" else f"{(task.corrected_effort_hours or task.estimated_effort_hours):.1f}h"
    dot = {"high": "red", "medium": "amber", "low": "green"}[bucket]

    return DashboardTask(
        id=task.id,
        name=task.title,
        subtitle=f"{bucket_title} | {due_phrase}",
        dot=dot,
        badge=bucket,
        label=label,
    )


def _format_due_phrase(due_date: datetime, now: datetime) -> str:
    local_due = due_date.astimezone()
    delta_hours = (due_date - now).total_seconds() / 3600.0
    time_label = local_due.strftime("%I:%M %p").lstrip("0")
    if delta_hours < 0:
        overdue_hours = int(abs(delta_hours))
        return f"overdue by {overdue_hours}h"
    if delta_hours < 24:
        return f"due today {time_label}"
    if delta_hours < 48:
        return f"due tomorrow {time_label}"
    return f"due {local_due.strftime('%a')} {time_label}"


def _build_metrics(tasks: list[Task], distortion_multiplier: float, now: datetime) -> DashboardMetrics:
    if not tasks:
        return DashboardMetrics(healthScore=70, healthLabel="Stable", atRiskCount=0, distortionMultiplier=round(distortion_multiplier, 1))

    average_failure = sum(task.failure_risk or 0.0 for task in tasks) / len(tasks)
    average_course_prior = sum(task.course_risk_prior or 0.0 for task in tasks) / len(tasks)
    blended_model_risk = 0.65 * average_failure + 0.35 * average_course_prior
    raw_health = (1.0 - blended_model_risk) * 100.0 - (distortion_multiplier - 1.0) * 8.0
    health_score = int(round(clamp(raw_health, 18.0, 97.0)))
    if health_score >= 75:
        health_label = "Stable"
    elif health_score >= 55:
        health_label = "Risk building"
    else:
        health_label = "Fragile"

    week_horizon = now + timedelta(days=7)
    at_risk_count = sum(1 for task in tasks if (task.failure_risk or 0.0) >= 0.65 and task.due_date <= week_horizon)
    return DashboardMetrics(
        healthScore=health_score,
        healthLabel=health_label,
        atRiskCount=at_risk_count,
        distortionMultiplier=round(distortion_multiplier, 1),
    )


def _build_resting_rate(tasks: list[Task], personalization: PersonalizationSignals) -> int:
    if not tasks:
        return 66
    average_failure = sum(task.failure_risk or 0.0 for task in tasks) / len(tasks)
    raw = 58.0 + average_failure * 17.0 + min(personalization.start_lag_hours, 60.0) / 7.0
    return int(round(clamp(raw, 52.0, 94.0)))


def _build_distortion_profile(
    events: list[ParsedCalendarEvent],
    personalization: PersonalizationSignals,
    distortion_multiplier: float,
    tasks: list[Task],
) -> list[str]:
    start_delay_days = personalization.start_lag_hours / 24.0
    focus_window = _best_focus_window(events)
    constrained_day = _most_constrained_weekday(events)
    grade_drag_points = _estimated_grade_drag_points(tasks)
    return [
        f"You underestimate programming work by {distortion_multiplier:.1f}x",
        f"You start work {start_delay_days:.1f} days later than planned",
        f"Your best focus window is {focus_window}",
        f"{constrained_day} schedule leaves too little uninterrupted time",
        f"Current trajectory implies roughly a {grade_drag_points:.1f}-point grade drag this term",
    ]


def _estimated_grade_drag_points(tasks: list[Task]) -> float:
    if not tasks:
        return 0.0
    average_failure = sum(task.failure_risk or 0.0 for task in tasks) / len(tasks)
    average_course_prior = sum(task.course_risk_prior or 0.0 for task in tasks) / len(tasks)
    blended_model_risk = 0.65 * average_failure + 0.35 * average_course_prior
    return round(clamp(blended_model_risk * 18.0, 0.0, 18.0), 1)


def _best_focus_window(events: list[ParsedCalendarEvent]) -> str:
    if not events:
        return "9 PM-1 AM"
    hour_counts = Counter(event.due.astimezone().hour for event in events)
    late_hours = sum(count for hour, count in hour_counts.items() if hour >= 20 or hour <= 1)
    morning_hours = sum(count for hour, count in hour_counts.items() if 7 <= hour < 12)
    afternoon_hours = sum(count for hour, count in hour_counts.items() if 12 <= hour < 18)
    if late_hours >= max(morning_hours, afternoon_hours):
        return "9 PM-1 AM"
    if morning_hours >= afternoon_hours:
        return "8 AM-12 PM"
    return "2 PM-6 PM"


def _most_constrained_weekday(events: list[ParsedCalendarEvent]) -> str:
    if not events:
        return "Thursday"
    counts = Counter(event.due.astimezone().strftime("%A") for event in events)
    best_day = WEEKDAY_ORDER[0]
    best_count = -1
    for day in WEEKDAY_ORDER:
        count = counts.get(day, 0)
        if count > best_count:
            best_count = count
            best_day = day
    return best_day


def _build_intervention(tasks: list[Task], now: datetime) -> DashboardIntervention:
    if not tasks:
        return DashboardIntervention(
            probBefore=40,
            probAfter=72,
            description="Grind is waiting for the first due item to build a focus intervention.",
        )

    target = max(tasks, key=lambda task: task.failure_risk or 0.0)
    failure_risk = target.failure_risk or 0.0
    success_before = int(round(clamp((1.0 - failure_risk) * 100.0, 4.0, 94.0)))
    focus_block_hours = clamp((target.corrected_effort_hours or target.estimated_effort_hours) / 2.0, 1.5, 4.5)
    success_after = int(round(clamp(success_before + 18.0 + focus_block_hours * 7.0, success_before + 1.0, 98.0)))
    deadline = target.due_date.astimezone()
    due_label = deadline.strftime("%a %I:%M %p").replace(" 0", " ")
    description = (
        f"Grind moved low-priority commitments and reserved a {focus_block_hours:.1f}-hour focus block for "
        f"{target.title} before {due_label}."
    )
    return DashboardIntervention(probBefore=success_before, probAfter=success_after, description=description)


def _build_summary(at_risk_count: int, health_label: str) -> str:
    if at_risk_count <= 0:
        return "Your semester health is stable. Keep momentum on the current plan."
    if at_risk_count == 1:
        return f"Your semester health is {health_label.lower()}. One task needs attention this week."
    return f"Your semester health is {health_label.lower()}. {at_risk_count} tasks need attention this week."
