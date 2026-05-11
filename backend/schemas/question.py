from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class QuestionCreate(BaseModel):
    content: str = Field(min_length=5)
    category_id: str
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"
    chapter: str | None = Field(default=None, max_length=255)
    topic: str | None = Field(default=None, max_length=255)
    option_a: str = Field(min_length=1, max_length=500)
    option_b: str = Field(min_length=1, max_length=500)
    option_c: str = Field(min_length=1, max_length=500)
    option_d: str = Field(min_length=1, max_length=500)
    correct_answer: Literal["a", "b", "c", "d"]

    @field_validator("correct_answer")
    @classmethod
    def lowercase_answer(cls, v: str) -> str:
        return v.lower()


class QuestionUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=5)
    category_id: str | None = None
    difficulty: Literal["EASY", "MEDIUM", "HARD"] | None = None
    chapter: str | None = Field(default=None, max_length=255)
    topic: str | None = Field(default=None, max_length=255)
    option_a: str | None = Field(default=None, min_length=1, max_length=500)
    option_b: str | None = Field(default=None, min_length=1, max_length=500)
    option_c: str | None = Field(default=None, min_length=1, max_length=500)
    option_d: str | None = Field(default=None, min_length=1, max_length=500)
    correct_answer: Literal["a", "b", "c", "d"] | None = None


# Returned to students during a quiz — correct_answer is intentionally absent
class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content: str
    category_id: str
    difficulty: str
    chapter: str | None
    topic: str | None
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    created_by: str
    created_at: datetime


# Returned to admins only — includes correct_answer
class QuestionOutAdmin(QuestionOut):
    correct_answer: str


# Returned after attempt submission so student can review answers
class QuestionOutWithResult(QuestionOut):
    correct_answer: str
    student_answer: str | None  # what the student picked (or None if skipped)
    is_correct: bool
