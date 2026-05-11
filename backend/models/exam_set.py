import uuid

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class ExamSet(Base):
    __tablename__ = "exam_sets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"), nullable=False, index=True)
    # "A", "B", "C", ...
    set_label: Mapped[str] = mapped_column(String(1), nullable=False)
    # Ordered list of question IDs for this set
    question_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Relationships
    exam = relationship("Exam", back_populates="sets")
    attempts = relationship("Attempt", back_populates="exam_set", lazy="select")
