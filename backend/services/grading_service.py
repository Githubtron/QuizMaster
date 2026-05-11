"""
Auto-grading service — called after attempt submission.
Scores the attempt and assembles the full result with per-question breakdown.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.exam import Exam
from models.exam_set import ExamSet
from models.question import Question
from schemas.attempt import AttemptResult
from schemas.question import QuestionOutWithResult

logger = logging.getLogger(__name__)


async def grade_attempt(attempt: Attempt, db: AsyncSession) -> AttemptResult:
    """
    1. Fetch the ordered questions for this attempt's set.
    2. Compare student answers to correct answers.
    3. Persist score and submitted_at on the Attempt row.
    4. Return a full AttemptResult schema.
    """
    # Load the exam and set
    exam_result = await db.execute(select(Exam).where(Exam.id == attempt.exam_id))
    exam = exam_result.scalar_one()

    set_result = await db.execute(select(ExamSet).where(ExamSet.id == attempt.set_id))
    exam_set = set_result.scalar_one()

    question_ids: list[str] = exam_set.question_ids

    # Fetch questions preserving set order
    q_result = await db.execute(
        select(Question).where(Question.id.in_(question_ids))
    )
    q_map = {q.id: q for q in q_result.scalars().all()}
    ordered_questions = [q_map[qid] for qid in question_ids if qid in q_map]

    student_answers: dict[str, str] = attempt.answers or {}
    correct_count = 0
    question_results: list[QuestionOutWithResult] = []

    for q in ordered_questions:
        student_ans = student_answers.get(q.id)
        is_correct = student_ans == q.correct_answer
        if is_correct:
            correct_count += 1

        question_results.append(
            QuestionOutWithResult(
                id=q.id,
                content=q.content,
                category_id=q.category_id,
                difficulty=q.difficulty,
                chapter=q.chapter,
                topic=q.topic,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                created_by=q.created_by,
                created_at=q.created_at,
                correct_answer=q.correct_answer,
                student_answer=student_ans,
                is_correct=is_correct,
            )
        )

    total = len(ordered_questions)
    score = round((correct_count / total) * 100, 2) if total > 0 else 0.0

    # Persist results
    now = datetime.now(timezone.utc)
    attempt.score = score
    attempt.status = "SUBMITTED"
    attempt.submitted_at = now
    await db.flush()

    duration_seconds = None
    if attempt.started_at:
        delta = now - attempt.started_at
        duration_seconds = int(delta.total_seconds())

    return AttemptResult(
        attempt_id=attempt.id,
        exam_id=exam.id,
        exam_title=exam.title,
        set_label=exam_set.set_label,
        score=score,
        total_questions=total,
        correct_count=correct_count,
        duration_seconds=duration_seconds,
        submitted_at=now,
        questions=question_results,
    )
