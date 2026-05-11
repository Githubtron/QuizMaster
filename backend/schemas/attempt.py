from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from schemas.question import QuestionOutWithResult


class AttemptCreate(BaseModel):
    exam_id: str


class AttemptSubmit(BaseModel):
    # Maps question_id → chosen option letter ("a" | "b" | "c" | "d")
    answers: dict[str, str]

    @field_validator("answers")
    @classmethod
    def validate_answer_values(cls, v: dict[str, str]) -> dict[str, str]:
        valid = {"a", "b", "c", "d"}
        for qid, ans in v.items():
            if ans.lower() not in valid:
                raise ValueError(f"Answer for question {qid} must be a, b, c or d")
        return {k: v2.lower() for k, v2 in v.items()}


# Returned immediately after starting — no score yet
class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    exam_id: str
    student_id: str
    set_id: str
    started_at: datetime
    submitted_at: datetime | None
    answers: dict
    score: float | None
    status: str


class AttemptOutWithStudent(AttemptOut):
    """AttemptOut enriched with student name — used by professor/admin results views."""
    student_name: str | None = None
    set_label: str | None = None


# Returned after submission with full result breakdown
class AttemptResult(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    set_label: str
    score: float
    total_questions: int
    correct_count: int
    duration_seconds: int | None
    submitted_at: datetime
    questions: list[QuestionOutWithResult]
