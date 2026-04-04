from __future__ import annotations

from builder_c.starter.data_loader import TaskInput
from builder_c.starter.modeling import available_focus_hours


def _join_reasons(reasons: list[str]) -> str:
    if not reasons:
        return ""
    if len(reasons) == 1:
        return reasons[0]
    return ", ".join(reasons[:-1]) + ", and " + reasons[-1]


def build_risk_explanation(
    task: TaskInput,
    corrected_effort_hours: float,
    failure_probability: float,
) -> str:
    reasons: list[str] = []
    realistic_focus = available_focus_hours(task)
    pressure_ratio = corrected_effort_hours / realistic_focus

    if pressure_ratio >= 1.0:
        reasons.append("the corrected effort is heavy for the realistic focus time left")
    if task.hours_until_due <= 36.0:
        reasons.append("the deadline is close")
    if task.start_delay_hours >= 12.0:
        reasons.append("the work is starting late")
    if task.weekly_course_load >= 15.0:
        reasons.append("the rest of the week is already crowded")

    if not reasons:
        return "This task is lower risk because the corrected effort still fits inside the realistic time left."

    if failure_probability >= 0.7:
        return f"This task is high risk because {_join_reasons(reasons)}."
    if failure_probability >= 0.4:
        return f"This task is building risk because {_join_reasons(reasons)}."
    return f"This task is still manageable, but watch it because {_join_reasons(reasons)}."
