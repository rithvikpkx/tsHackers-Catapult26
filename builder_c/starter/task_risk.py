from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from builder_c.starter.config import (
    COMPLETION_PENALTY_WEIGHT,
    COURSE_PRIOR_WEIGHT,
    FOCUS_ACCEPTANCE_WEIGHT,
    FOCUS_PENALTY_WEIGHT,
    OVERDUE_PENALTY_WEIGHT,
    START_DELAY_WEIGHT,
    START_LAG_TREND_WEIGHT,
    STATUS_WEIGHTS,
    URGENCY_WEIGHT,
)
from builder_c.starter.data_loader import PersonalizationSignals, TaskInput, clamp


def risk_bucket(probability: float) -> str:
    if probability >= 0.7:
        return "high"
    if probability >= 0.4:
        return "medium"
    return "low"


def urgency_score(hours_until_due: float) -> float:
    return clamp((72.0 - hours_until_due) / 72.0, 0.0, 1.0)


@dataclass
class ScoredTask:
    task_id: str
    title: str
    course: str
    task_type: str
    estimate_hours: float
    corrected_effort_hours: float
    course_risk_prior: float
    failure_risk: float
    risk_bucket: str
    risk_explanation: str
    drivers: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        payload = self.__dict__.copy()
        payload["drivers"] = {key: round(value, 4) for key, value in self.drivers.items()}
        return payload


def score_task_risk(task: TaskInput, personalization: PersonalizationSignals) -> tuple[float, dict[str, float]]:
    normalized = personalization.normalized()
    drivers = {
        "course_prior": COURSE_PRIOR_WEIGHT * clamp(task.course_risk_prior, 0.0, 1.0),
        "urgency": URGENCY_WEIGHT * urgency_score(task.hours_until_due),
        "status": STATUS_WEIGHTS.get(task.status, STATUS_WEIGHTS["todo"]),
        "start_delay": START_DELAY_WEIGHT * clamp(task.start_delay_hours / 24.0, 0.0, 1.0),
        "recent_completion_penalty": COMPLETION_PENALTY_WEIGHT * (1.0 - normalized.recent_completion_rate),
        "recent_overdue_penalty": OVERDUE_PENALTY_WEIGHT * clamp(normalized.recent_overdue_count / 3.0, 0.0, 1.0),
        "focus_completion_penalty": FOCUS_PENALTY_WEIGHT * (1.0 - normalized.focus_block_completion_rate),
        "start_lag_trend": START_LAG_TREND_WEIGHT * clamp(normalized.start_lag_hours / 24.0, 0.0, 1.0),
        "focus_acceptance_penalty": FOCUS_ACCEPTANCE_WEIGHT * (1.0 - normalized.focus_block_accept_rate),
    }
    risk = clamp(sum(drivers.values()), 0.02, 0.98)
    return round(risk, 2), drivers
