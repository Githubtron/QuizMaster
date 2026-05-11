from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_admin, require_professor
from models.attempt import Attempt
from models.exam import Exam
from models.user import User

router = APIRouter()


@router.get("/platform")
async def platform_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide analytics — ADMIN only."""
    exams_result = await db.execute(select(Exam))
    exams = exams_result.scalars().all()

    attempts_result = await db.execute(select(Attempt))
    attempts = attempts_result.scalars().all()

    submitted = [a for a in attempts if a.status in ("SUBMITTED", "TIMED_OUT")]
    passed    = [a for a in submitted if (a.score or 0) >= 60]

    scores_by_exam: dict[str, list[float]] = {}
    for a in submitted:
        scores_by_exam.setdefault(a.exam_id, []).append(a.score or 0)

    exam_map = {e.id: e.title for e in exams}
    exam_stats = [
        {
            "exam_id":   eid,
            "exam_title": exam_map.get(eid, eid[:8]),
            "attempts":  len(scores),
            "avg_score": round(sum(scores) / len(scores), 2),
        }
        for eid, scores in scores_by_exam.items()
    ]

    return {
        "total_exams":    len(exams),
        "total_attempts": len(attempts),
        "submitted":      len(submitted),
        "pass_rate":      round(len(passed) / len(submitted) * 100, 2) if submitted else 0,
        "avg_score":      round(sum(a.score or 0 for a in submitted) / len(submitted), 2) if submitted else 0,
        "exam_stats":     sorted(exam_stats, key=lambda x: x["attempts"], reverse=True),
    }


@router.get("/professor")
async def professor_analytics(
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    """Analytics for all exams — visible to all professors."""
    exams_result = await db.execute(select(Exam))
    exams = exams_result.scalars().all()
    exam_ids = [e.id for e in exams]

    if not exam_ids:
        return {"total_exams": 0, "total_attempts": 0, "avg_score": 0, "exam_stats": []}

    attempts_result = await db.execute(
        select(Attempt).where(Attempt.exam_id.in_(exam_ids))
    )
    attempts = attempts_result.scalars().all()
    submitted = [a for a in attempts if a.status in ("SUBMITTED", "TIMED_OUT")]

    scores_by_exam: dict[str, list[float]] = {}
    for a in submitted:
        scores_by_exam.setdefault(a.exam_id, []).append(a.score or 0)

    exam_map = {e.id: e.title for e in exams}
    exam_stats = [
        {
            "exam_id":    eid,
            "exam_title": exam_map.get(eid, eid[:8]),
            "attempts":   len(scores),
            "avg_score":  round(sum(scores) / len(scores), 2),
            "pass_rate":  round(sum(1 for s in scores if s >= 60) / len(scores) * 100, 2),
        }
        for eid, scores in scores_by_exam.items()
    ]

    return {
        "total_exams":    len(exams),
        "total_attempts": len(submitted),
        "avg_score":      round(sum(a.score or 0 for a in submitted) / len(submitted), 2) if submitted else 0,
        "exam_stats":     exam_stats,
    }
