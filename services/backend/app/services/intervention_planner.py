from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models import ScheduleBlock, Task


def _round_up_to_half_hour(value: datetime) -> datetime:
    minute_block = 30
    extra_minutes = (minute_block - (value.minute % minute_block)) % minute_block
    rounded = value + timedelta(minutes=extra_minutes)
    return rounded.replace(second=0, microsecond=0)


def _overlaps(left_start: datetime, left_end: datetime, right: ScheduleBlock) -> bool:
    return left_start < right.end and left_end > right.start


def normalize_schedule(blocks: list[ScheduleBlock]) -> list[ScheduleBlock]:
    return sorted(blocks, key=lambda block: block.start)


def choose_focus_block(task: Task, blocks: list[ScheduleBlock]) -> ScheduleBlock:
    now = datetime.now(timezone.utc)
    schedule = normalize_schedule(blocks)
    duration_hours = min(max(task.corrected_effort_hours or task.estimated_effort_hours, 0.75), 2.5)
    duration = timedelta(hours=duration_hours)
    search_start = _round_up_to_half_hour(max(now, task.due_date - timedelta(days=2)))
    latest_start = max(search_start, task.due_date - duration - timedelta(minutes=30))

    cursor = search_start
    while cursor <= latest_start:
        candidate_end = cursor + duration
        local_hour = cursor.astimezone(task.due_date.tzinfo or timezone.utc).hour
        if 8 <= local_hour <= 21 and not any(_overlaps(cursor, candidate_end, block) for block in schedule):
            return ScheduleBlock(start=cursor, end=candidate_end, label=f"Focus: {task.title}")
        cursor += timedelta(minutes=30)

    fallback_end = task.due_date - timedelta(hours=1)
    fallback_start = fallback_end - duration
    return ScheduleBlock(start=fallback_start, end=fallback_end, label=f"Focus: {task.title}")


def estimate_risk_after(task: Task, focus_block: ScheduleBlock) -> float:
    risk_before = task.failure_risk or task.course_risk_prior or 0.5
    focus_hours = max((focus_block.end - focus_block.start).total_seconds() / 3600.0, 0.5)
    reduction = min(0.12 + focus_hours * 0.07, 0.32)
    if task.status.value == "in_progress":
        reduction += 0.05
    return max(0.05, round(risk_before - reduction, 4))


def build_smallest_next_step(task: Task) -> str:
    label = (task.task_type or task.title).lower()
    if "quiz" in label or "exam" in label:
        return "Open your notes, make a 5-question warm-up set, and solve the first two now."
    if "read" in label or "response" in label:
        return "Skim the reading once, then write three bullets you can reuse in the response."
    if "project" in label:
        return "Open the project brief, outline the first deliverable, and finish just that slice."
    return "Open the assignment, identify the first solvable section, and work on it for 10 focused minutes."
