from datetime import datetime
from enum import Enum
from typing import Any, Optional

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
    task_type: str = Field(default="unknown")
    due_date: datetime
    estimated_effort_hours: float = Field(ge=0)
    corrected_effort_hours: Optional[float] = Field(default=None, ge=0)
    course_risk_prior: Optional[float] = Field(default=None, ge=0, le=1)
    failure_risk: Optional[float] = Field(default=None, ge=0, le=1)
    risk_explanation: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None
    actual_duration_hours: Optional[float] = Field(default=None, ge=0)
    predicted_start_delay_hours: Optional[float] = Field(default=None, ge=0)
    predicted_completion_hours: Optional[float] = Field(default=None, ge=0)
    best_work_window: Optional[str] = None
    preferred_work_times: Optional[dict[str, float]] = None


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


class CalendarBlock(BaseModel):
    task_id: Optional[str] = None
    source: str = Field(default="google_calendar")
    block_type: str
    start: datetime
    end: datetime
    description: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CalendarBlocksRequest(BaseModel):
    blocks: list[CalendarBlock]


class TaskEventType(str, Enum):
    TASK_CREATED = "task_created"
    ESTIMATE_UPDATED = "estimate_updated"
    TASK_STARTED = "task_started"
    FOCUS_BLOCK_ACCEPTED = "focus_block_accepted"
    FOCUS_BLOCK_COMPLETED = "focus_block_completed"
    TASK_COMPLETED = "task_completed"
    TASK_OVERDUE = "task_overdue"


class TaskEvent(BaseModel):
    event_type: TaskEventType
    task_id: str
    occurred_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class PersonalizationSignals(BaseModel):
    recent_completion_rate: float = Field(ge=0, le=1)
    recent_overdue_count: float = Field(ge=0)
    start_lag_hours: float = Field(ge=0)
    focus_block_accept_rate: float = Field(ge=0, le=1)
    focus_block_completion_rate: float = Field(ge=0, le=1)

