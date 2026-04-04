from fastapi import APIRouter

from app.auth import AuthDep
from app.repos.tasks_repo import list_tasks as list_tasks_for_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(auth=AuthDep) -> dict[str, float | int | str | list[str] | None]:
    tasks = list_tasks_for_user(auth.user_id)
    hot_task = max(tasks, key=lambda task: task.failure_risk or 0, default=None)
    at_risk_count = sum(1 for task in tasks if (task.failure_risk or 0) >= 0.6)

    # Demo values intentionally fixed for hackathon consistency.
    return {
        "health_score": 74,
        "health_label": "Stable",
        "resting_rate": 68,
        "distortion_average": 2.1,
        "at_risk_count": at_risk_count,
        "hot_task_title": hot_task.title if hot_task else None,
        "hot_task_risk": hot_task.failure_risk if hot_task else None,
        "distortion_notes": [
            "You underestimate programming assignments by about 2.1x",
            "You start heavy tasks later than planned on average",
            "Your strongest focus window is late evening",
        ],
    }

