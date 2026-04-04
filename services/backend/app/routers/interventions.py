from fastapi import APIRouter, HTTPException

from app.auth import AuthDep
from app.models import InterventionRequest, InterventionResponse
from app.repos.tasks_repo import get_task_by_id
from app.services.intervention_planner import (
    build_smallest_next_step,
    choose_focus_block,
    estimate_risk_after,
    normalize_schedule,
)

router = APIRouter(prefix="/api/interventions", tags=["interventions"])


@router.post("/plan", response_model=InterventionResponse)
def plan_intervention(payload: InterventionRequest, auth=AuthDep) -> InterventionResponse:
    task = get_task_by_id(auth.user_id, payload.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    now_blocks = normalize_schedule(payload.current_schedule)
    intervention_block = choose_focus_block(task, now_blocks)
    risk_before = task.failure_risk or task.course_risk_prior or 0.5
    risk_after = estimate_risk_after(task, intervention_block)

    return InterventionResponse(
        task_id=task.id,
        risk_before=risk_before,
        risk_after=risk_after,
        before=now_blocks,
        after=now_blocks + [intervention_block],
        smallest_next_step=build_smallest_next_step(task),
    )

