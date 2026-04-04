from datetime import timedelta

from fastapi import APIRouter, HTTPException

from app.models import InterventionRequest, InterventionResponse, ScheduleBlock
from app.store import TASKS

router = APIRouter(prefix="/api/interventions", tags=["interventions"])


@router.post("/plan", response_model=InterventionResponse)
def plan_intervention(payload: InterventionRequest) -> InterventionResponse:
    task = TASKS.get(payload.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    now_blocks = payload.current_schedule
    focus_start = task.due_date - timedelta(hours=10)
    focus_end = focus_start + timedelta(hours=2)
    intervention_block = ScheduleBlock(
        start=focus_start,
        end=focus_end,
        label=f"Focus: {task.title}",
    )

    return InterventionResponse(
        task_id=task.id,
        risk_before=task.failure_risk or task.course_risk_prior or 0.72,
        risk_after=max(0.15, (task.failure_risk or task.course_risk_prior or 0.72) - 0.3),
        before=now_blocks,
        after=now_blocks + [intervention_block],
        smallest_next_step="Open notes and solve only question 1 for 10 minutes.",
    )

