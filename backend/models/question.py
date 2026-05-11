import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), nullable=False)
    difficulty: Mapped[str] = mapped_column(
        Enum("EASY", "MEDIUM", "HARD", name="difficulty_level"),
        nullable=False,
        default="MEDIUM",
    )
    chapter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)

    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    # Stores "a", "b", "c", or "d" — NEVER returned to student before submission
    correct_answer: Mapped[str] = mapped_column(String(1), nullable=False)

    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    category = relationship("Category", back_populates="questions")
    creator = relationship("User", back_populates="questions")
