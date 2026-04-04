from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from builder_c.starter.config import DATA_DIR, TASK_TYPES


@dataclass
class TaskInput:
    task_id: str
    title: str
    course: str
    task_type: str
    estimate_hours: float
    hours_until_due: float
    start_delay_hours: float
    weekly_course_load: float


@dataclass
class DistortionTrainingSample(TaskInput):
    actual_hours: float


@dataclass
class RiskTrainingSample(TaskInput):
    actual_hours: float
    missed_deadline: bool


def _read_json(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_task_type(task_type: str) -> str:
    if task_type not in TASK_TYPES:
        raise ValueError(f"Unsupported task_type '{task_type}'. Expected one of {TASK_TYPES}.")
    return task_type


def task_from_dict(payload: dict[str, Any]) -> TaskInput:
    return TaskInput(
        task_id=str(payload["task_id"]),
        title=str(payload["title"]),
        course=str(payload["course"]),
        task_type=_validate_task_type(str(payload["task_type"])),
        estimate_hours=float(payload["estimate_hours"]),
        hours_until_due=float(payload["hours_until_due"]),
        start_delay_hours=float(payload["start_delay_hours"]),
        weekly_course_load=float(payload["weekly_course_load"]),
    )


def load_distortion_training_samples() -> list[DistortionTrainingSample]:
    samples: list[DistortionTrainingSample] = []
    for row in _read_json(DATA_DIR / "distortion_training.json"):
        task = task_from_dict(row)
        samples.append(
            DistortionTrainingSample(
                **task.__dict__,
                actual_hours=float(row["actual_hours"]),
            )
        )
    return samples


def load_risk_training_samples() -> list[RiskTrainingSample]:
    samples: list[RiskTrainingSample] = []
    for row in _read_json(DATA_DIR / "risk_training.json"):
        task = task_from_dict(row)
        samples.append(
            RiskTrainingSample(
                **task.__dict__,
                actual_hours=float(row["actual_hours"]),
                missed_deadline=bool(row["missed_deadline"]),
            )
        )
    return samples


def load_demo_tasks() -> list[TaskInput]:
    return [task_from_dict(row) for row in _read_json(DATA_DIR / "demo_tasks.json")]


def task_to_dict(task: TaskInput) -> dict[str, Any]:
    return {
        "task_id": task.task_id,
        "title": task.title,
        "course": task.course,
        "task_type": task.task_type,
        "estimate_hours": task.estimate_hours,
        "hours_until_due": task.hours_until_due,
        "start_delay_hours": task.start_delay_hours,
        "weekly_course_load": task.weekly_course_load,
    }
