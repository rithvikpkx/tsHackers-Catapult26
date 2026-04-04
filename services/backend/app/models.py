from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"


class Task(BaseModel):
    id: str
    title: str
    course: str
    due_date: datetime
    estimated_effort_hours: float = Field(ge=0)
    corrected_effort_hours: Optional[float] = Field(default=None, ge=0)
    failure_risk: Optional[float] = Field(default=None, ge=0, le=1)
    status: TaskStatus = TaskStatus.TODO


class IngestRequest(BaseModel):
    source: str = Field(description="seeded_brightspace_import or manual_import")
    tasks: list[Task]


class ScheduleBlock(BaseModel):
    start: datetime
    end: datetime
    label: str


class InterventionRequest(BaseModel):
    task_id: str
    current_schedule: list[ScheduleBlock]


class InterventionResponse(BaseModel):
    task_id: str
    risk_before: float = Field(ge=0, le=1)
    risk_after: float = Field(ge=0, le=1)
    before: list[ScheduleBlock]
    after: list[ScheduleBlock]
    smallest_next_step: str


class CalendarFocusBlockRequest(BaseModel):
    task_id: str
    title: str
    start: datetime
    end: datetime

