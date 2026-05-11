from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExamCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category_id: str
    duration_minutes: int = Field(ge=1, le=480)
    total_questions: int = Field(ge=1, le=200)
    num_sets: int = Field(ge=1, le=26, default=1)  # max 26 sets (A–Z)
    is_active: bool = True
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


class ExamUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=480)
    total_questions: int | None = Field(default=None, ge=1, le=200)
    num_sets: int | None = Field(default=None, ge=1, le=26)
    is_active: bool | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


class ExamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    category_id: str
    duration_minutes: int
    total_questions: int
    num_sets: int
    is_active: bool
    created_by: str
    created_at: datetime
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


# Lightweight card shown in student dashboard
class ExamCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    duration_minutes: int
    total_questions: int
    category_id: str
