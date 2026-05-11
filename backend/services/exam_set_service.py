"""
Paper-set generation service.
Builds balanced, non-overlapping sets (A, B, C, …) from a pool of questions.
Each set gets equal chapter and difficulty distribution.
"""

import logging
import random
import string
from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.exam import Exam
from models.exam_set import ExamSet
from models.question import Question

logger = logging.getLogger(__name__)


async def generate_sets_for_exam(exam: Exam, db: AsyncSession) -> list[ExamSet]:
    """
    Called when an exam is created or regenerated.
    Deletes old sets, then creates `exam.num_sets` balanced sets.
    Returns the newly created ExamSet ORM objects.
    """
    # Block regeneration if students have already attempted this exam
    old_sets_result = await db.execute(select(ExamSet).where(ExamSet.exam_id == exam.id))
    old_set_ids = [s.id for s in old_sets_result.scalars().all()]
    if old_set_ids:
        attempt_count = await db.scalar(
            select(func.count(Attempt.id)).where(Attempt.set_id.in_(old_set_ids))
        )
        if attempt_count:
            raise ValueError(
                f"Cannot regenerate sets: {attempt_count} student attempt(s) already exist for this exam."
            )

    # Remove any previously generated sets (safe — no attempts exist)
    old_sets_result2 = await db.execute(select(ExamSet).where(ExamSet.exam_id == exam.id))
    for s in old_sets_result2.scalars().all():
        await db.delete(s)

    # Fetch all questions for this exam's category
    q_result = await db.execute(
        select(Question).where(Question.category_id == exam.category_id)
    )
    all_questions = q_result.scalars().all()

    total_needed = exam.total_questions * exam.num_sets
    if len(all_questions) < total_needed:
        raise ValueError(
            f"Not enough questions: need {total_needed} "
            f"({exam.num_sets} sets × {exam.total_questions}), "
            f"found {len(all_questions)}"
        )

    selected_ids = _balanced_select(all_questions, exam.total_questions, exam.num_sets)

    labels = list(string.ascii_uppercase[: exam.num_sets])
    new_sets = []
    for label, ids in zip(labels, selected_ids):
        es = ExamSet(exam_id=exam.id, set_label=label, question_ids=ids)
        db.add(es)
        new_sets.append(es)

    await db.flush()
    logger.info("Generated %d sets for exam %s", exam.num_sets, exam.id)
    return new_sets


def _balanced_select(
    questions: list[Question],
    per_set: int,
    num_sets: int,
) -> list[list[str]]:
    """
    Partition questions into `num_sets` non-overlapping lists of `per_set` IDs.
    Balance by (chapter, difficulty) bucket so each set is representative.
    """
    # Group by (chapter, difficulty)
    buckets: dict[tuple, list[Question]] = defaultdict(list)
    for q in questions:
        key = (q.chapter or "default", q.difficulty)
        buckets[key].append(q)

    # Shuffle within each bucket for randomness
    for lst in buckets.values():
        random.shuffle(lst)

    # Round-robin across buckets to fill each set
    sets: list[list[str]] = [[] for _ in range(num_sets)]
    bucket_iters = {k: iter(v) for k, v in buckets.items()}
    bucket_keys = list(bucket_iters.keys())

    set_idx = 0
    bucket_idx = 0
    attempts = 0
    max_attempts = per_set * num_sets * len(bucket_keys) + 1

    while any(len(s) < per_set for s in sets) and attempts < max_attempts:
        attempts += 1
        key = bucket_keys[bucket_idx % len(bucket_keys)]
        bucket_idx += 1

        try:
            q = next(bucket_iters[key])
        except StopIteration:
            continue

        if len(sets[set_idx]) < per_set:
            sets[set_idx].append(q.id)
            set_idx = (set_idx + 1) % num_sets

    # Fallback: if any set is still short, fill from remaining questions
    used = {qid for s in sets for qid in s}
    remaining = [q.id for q in questions if q.id not in used]
    random.shuffle(remaining)
    rem_iter = iter(remaining)
    for s in sets:
        while len(s) < per_set:
            try:
                s.append(next(rem_iter))
            except StopIteration:
                break

    return sets


async def assign_set_to_student(exam: Exam, student_id: str, db: AsyncSession) -> ExamSet:
    """
    Deterministically assigns the same set to the same student every time
    (hash of student_id mod num_sets). Creates sets if none exist yet.
    """
    sets_result = await db.execute(
        select(ExamSet).where(ExamSet.exam_id == exam.id).order_by(ExamSet.set_label)
    )
    exam_sets = sets_result.scalars().all()

    if not exam_sets:
        exam_sets = await generate_sets_for_exam(exam, db)

    # Stable assignment: same student always gets same set
    idx = hash(student_id) % len(exam_sets)
    return exam_sets[idx]
