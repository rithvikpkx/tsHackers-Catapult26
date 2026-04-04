from __future__ import annotations

from builder_c.starter.data_loader import PersonalizationSignals, StudentCourseSnapshot, TaskInput
from builder_c.starter.task_risk import risk_bucket


def build_course_prior_explanation(
    snapshot: StudentCourseSnapshot,
    course_risk_prior: float,
    thresholds: dict[str, float],
) -> str:
    reasons: list[str] = []
    if snapshot.missing_submissions_30d > 0:
        reasons.append("an early assessment is still missing")
    if snapshot.weighted_score_pct_30d <= thresholds.get("weighted_score_pct_30d_low", 35.0):
        reasons.append("early assessment scores are trailing")
    if snapshot.total_clicks_30d <= thresholds.get("total_clicks_30d_low", 80.0):
        reasons.append("course engagement is low")
    if snapshot.active_days_30d <= thresholds.get("active_days_30d_low", 8.0):
        reasons.append("study activity is clustered into too few days")
    if snapshot.num_of_prev_attempts >= 1:
        reasons.append("there have already been previous attempts")
    if snapshot.unregistered_by_day_30 >= 1:
        reasons.append("there is already an early withdrawal signal")

    if not reasons:
        return "The course prior is steady because early coursework and engagement look healthy."

    joined = _join_reasons(reasons[:3])
    if course_risk_prior >= 0.65:
        return f"The course context already looks risky because {joined}."
    return f"The course context needs watching because {joined}."


def build_task_risk_explanation(
    task: TaskInput,
    failure_risk: float,
    drivers: dict[str, float],
    personalization: PersonalizationSignals,
    course_prior_explanation: str,
) -> str:
    ordered = sorted(drivers.items(), key=lambda item: item[1], reverse=True)
    reasons: list[str] = []
    for key, _value in ordered:
        if key == "course_prior" and task.course_risk_prior >= 0.55:
            reasons.append("the course itself is already showing risk")
        elif key == "urgency" and task.hours_until_due <= 36:
            reasons.append("the deadline is close")
        elif key == "start_delay" and task.start_delay_hours >= 12:
            reasons.append("the task is starting late")
        elif key == "recent_overdue_penalty" and personalization.recent_overdue_count >= 1:
            reasons.append("recent misses are stacking up")
        elif key == "focus_completion_penalty" and personalization.focus_block_completion_rate < 0.6:
            reasons.append("focus blocks are not turning into finished work")
        elif key == "recent_completion_penalty" and personalization.recent_completion_rate < 0.6:
            reasons.append("recent completion rate is soft")
        if len(reasons) == 3:
            break

    if not reasons:
        reasons.append("the course prior is calm and the task timing is still workable")

    prefix = {
        "high": "This task is high risk because",
        "medium": "This task is building risk because",
        "low": "This task is lower risk because",
    }[risk_bucket(failure_risk)]

    return f"{prefix} {_join_reasons(reasons)}. {course_prior_explanation}"


def _join_reasons(reasons: list[str]) -> str:
    if len(reasons) == 1:
        return reasons[0]
    if len(reasons) == 2:
        return f"{reasons[0]} and {reasons[1]}"
    return ", ".join(reasons[:-1]) + f", and {reasons[-1]}"
