"""
Pydantic data models for jobs, execution steps, and system events.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepType(str, Enum):
    STEP_START = "step_start"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    STEP_END = "step_end"
    FINAL_ANSWER = "final_answer"
    ERROR = "error"


class JobStep(BaseModel):
    step_id: str
    step_type: StepType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    content: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class JobEvent(BaseModel):
    job_id: str
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payload: Dict[str, Any] = Field(default_factory=dict)


class RunRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Task instruction prompt")
    model_override: Optional[str] = None
    max_steps: Optional[int] = Field(default=30, ge=1, le=100)


class Job(BaseModel):
    id: str
    prompt: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    steps: List[JobStep] = Field(default_factory=list)
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
