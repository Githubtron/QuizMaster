from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_professor
from models.exam import Exam
from models.exam_set import ExamSet
from models.user import User
from schemas.exam_set import ExamSetOut
from services.exam_set_service import generate_sets_for_exam

router = APIRouter()


@router.get("/{exam_id}", response_model=list[ExamSetOut])
async def list_sets(
    exam_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if professor.role == "PROFESSOR" and exam.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(ExamSet).where(ExamSet.exam_id == exam_id).order_by(ExamSet.set_label)
    )
    return result.scalars().all()


@router.post("/{exam_id}/generate", response_model=list[ExamSetOut])
async def regenerate_sets(
    exam_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if professor.role == "PROFESSOR" and exam.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        sets = await generate_sets_for_exam(exam, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return sets
