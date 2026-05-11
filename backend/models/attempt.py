import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    set_id: Mapped[str] = mapped_column(ForeignKey("exam_sets.id"), nullable=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # {"question_id": "a", ...}
    answers: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("IN_PROGRESS", "SUBMITTED", "TIMED_OUT", name="attempt_status"),
        nullable=False,
        default="IN_PROGRESS",
    )

    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    student = relationship("User", back_populates="attempts")
    exam_set = relationship("ExamSet", back_populates="attempts")
