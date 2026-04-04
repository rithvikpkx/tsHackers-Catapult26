from fastapi import APIRouter

from app.auth import AuthDep
from app.models import TaskStatus
from app.repos.events_repo import list_events as list_events_for_user
from app.repos.tasks_repo import list_tasks as list_tasks_for_user
from app.store import derive_personalization_signals

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


@router.get("/summary")
def dashboard_summary(auth=AuthDep) -> dict[str, float | int | str | list[str] | None]:
    tasks = list_tasks_for_user(auth.user_id)
    events = list_events_for_user(auth.user_id)
    signals = derive_personalization_signals(auth.user_id, events)
    open_tasks = [task for task in tasks if task.status != TaskStatus.DONE]
    hot_task = max(open_tasks or tasks, key=lambda task: task.failure_risk or task.course_risk_prior or 0, default=None)
    at_risk_count = sum(1 for task in open_tasks if (task.failure_risk or 0) >= 0.6)
    avg_risk = (
        sum((task.failure_risk or task.course_risk_prior or 0.35) for task in open_tasks) / len(open_tasks)
        if open_tasks
        else 0.2
    )
    distortion_average = (
        sum(
            (task.corrected_effort_hours or task.estimated_effort_hours) / max(task.estimated_effort_hours, 0.5)
            for task in tasks
        )
        / len(tasks)
        if tasks
        else 1.0
    )
    health_score = round(
        _clamp(
            100
            - avg_risk * 55
            - min(signals.recent_overdue_count * 8, 20)
            - min(signals.start_lag_hours * 1.5, 15)
            + signals.recent_completion_rate * 18,
            28,
            96,
        )
    )
    resting_rate = round(
        _clamp(
            56
            + avg_risk * 24
            + signals.recent_overdue_count * 2.5
            + signals.start_lag_hours * 0.4,
            54,
            96,
        )
    )

    notes: list[str] = []
    if distortion_average >= 1.6:
        notes.append(f"You are underestimating real effort by about {distortion_average:.1f}x right now.")
    else:
        notes.append(f"Your current effort correction is sitting around {distortion_average:.1f}x.")
    if signals.start_lag_hours >= 4:
        notes.append("You are starting important work later than planned, which is pushing risk upward.")
    if signals.recent_overdue_count >= 1:
        notes.append("Recent overdue tasks are compounding across the week.")
    if signals.focus_block_completion_rate >= 0.65:
        notes.append("You tend to follow through once a focus block is protected on the calendar.")
    elif signals.focus_block_accept_rate > 0:
        notes.append("Protected blocks help, but you are not consistently finishing them yet.")

    if health_score >= 82:
        health_label = "Stable"
    elif health_score >= 68:
        health_label = "Busy"
    elif health_score >= 52:
        health_label = "Risk building"
    else:
        health_label = "Red zone"

    return {
        "health_score": health_score,
        "health_label": health_label,
        "resting_rate": resting_rate,
        "distortion_average": round(distortion_average, 1),
        "at_risk_count": at_risk_count,
        "hot_task_title": hot_task.title if hot_task else None,
        "hot_task_risk": hot_task.failure_risk if hot_task else None,
        "distortion_notes": notes,
    }

