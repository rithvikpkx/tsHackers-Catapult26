from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from builder_c.starter.config import DATA_DIR, TASK_TYPES


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


@dataclass
class StudentCourseSnapshot:
    code_module: str
    code_presentation: str
    highest_education: str
    age_band: str
    imd_band: str
    studied_credits: float
    num_of_prev_attempts: float
    disability: str
    gender: str = "unknown"
    days_registered_before_start: float = 0.0
    module_presentation_length: float = 0.0
    unregistered_by_day_30: float = 0.0
    day_of_unregistration_capped: float = 31.0
    assessments_due_30d: float = 0.0
    assessments_submitted_30d: float = 0.0
    assessment_mean_score_30d: float = 0.0
    weighted_score_pct_30d: float = 0.0
    missing_submissions_30d: float = 0.0
    late_submissions_30d: float = 0.0
    total_clicks_30d: float = 0.0
    active_days_30d: float = 0.0
    unique_sites_30d: float = 0.0
    unique_activity_types_30d: float = 0.0
    pre_start_clicks: float = 0.0
    post_start_clicks: float = 0.0
    clicks_resource: float = 0.0
    clicks_oucontent: float = 0.0
    clicks_subpage: float = 0.0
    clicks_url: float = 0.0
    clicks_forumng: float = 0.0
    clicks_quiz: float = 0.0

    def to_feature_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PersonalizationSignals:
    recent_completion_rate: float = 0.6
    recent_overdue_count: float = 0.0
    start_lag_hours: float = 0.0
    focus_block_accept_rate: float = 0.7
    focus_block_completion_rate: float = 0.6

    def normalized(self) -> "PersonalizationSignals":
        return PersonalizationSignals(
            recent_completion_rate=clamp(self.recent_completion_rate, 0.0, 1.0),
            recent_overdue_count=max(self.recent_overdue_count, 0.0),
            start_lag_hours=max(self.start_lag_hours, 0.0),
            focus_block_accept_rate=clamp(self.focus_block_accept_rate, 0.0, 1.0),
            focus_block_completion_rate=clamp(self.focus_block_completion_rate, 0.0, 1.0),
        )


@dataclass
class TaskInput:
    task_id: str
    title: str
    course: str
    task_type: str
    estimate_hours: float
    corrected_effort_hours: float
    hours_until_due: float
    start_delay_hours: float
    status: str
    course_risk_prior: float = 0.0


@dataclass
class DemoTaskRecord:
    due_date: str
    task: TaskInput
    course_snapshot: StudentCourseSnapshot
    personalization_signals: PersonalizationSignals = field(default_factory=PersonalizationSignals)


def _read_json(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_task_type(task_type: str) -> str:
    if task_type not in TASK_TYPES:
        raise ValueError(f"Unsupported task_type '{task_type}'. Expected one of {TASK_TYPES}.")
    return task_type


def snapshot_from_dict(payload: dict[str, Any]) -> StudentCourseSnapshot:
    values = StudentCourseSnapshot(**payload)
    return values


def personalization_from_dict(payload: dict[str, Any] | None) -> PersonalizationSignals:
    if payload is None:
        return PersonalizationSignals()
    return PersonalizationSignals(**payload).normalized()


def task_from_dict(payload: dict[str, Any]) -> TaskInput:
    return TaskInput(
        task_id=str(payload["task_id"]),
        title=str(payload["title"]),
        course=str(payload["course"]),
        task_type=_validate_task_type(str(payload["task_type"])),
        estimate_hours=float(payload["estimate_hours"]),
        corrected_effort_hours=float(payload.get("corrected_effort_hours", payload["estimate_hours"])),
        hours_until_due=float(payload["hours_until_due"]),
        start_delay_hours=float(payload.get("start_delay_hours", 0.0)),
        status=str(payload.get("status", "todo")),
        course_risk_prior=float(payload.get("course_risk_prior", 0.0)),
    )


def load_demo_tasks() -> list[DemoTaskRecord]:
    records: list[DemoTaskRecord] = []
    for row in _read_json(DATA_DIR / "demo_tasks.json"):
        records.append(
            DemoTaskRecord(
                due_date=str(row["due_date"]),
                task=task_from_dict(row),
                course_snapshot=snapshot_from_dict(row["course_snapshot"]),
                personalization_signals=personalization_from_dict(row.get("personalization_signals")),
            )
        )
    return records


def task_to_seed_record(
    task: TaskInput,
    due_date: str,
    failure_risk: float,
    course_risk_prior: float,
    risk_explanation: str,
) -> dict[str, Any]:
    return {
        "id": task.task_id,
        "title": task.title,
        "course": task.course,
        "due_date": due_date,
        "estimated_effort_hours": task.estimate_hours,
        "corrected_effort_hours": task.corrected_effort_hours,
        "course_risk_prior": round(course_risk_prior, 2),
        "failure_risk": round(failure_risk, 2),
        "risk_explanation": risk_explanation,
        "status": task.status,
    }
