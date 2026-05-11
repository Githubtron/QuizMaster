from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_professor
from models.exam import Exam
from models.user import User
from schemas.exam import ExamCreate, ExamOut, ExamUpdate
from routers.ws import manager as ws_manager

router = APIRouter()


@router.get("/", response_model=list[ExamOut])
async def list_exams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Exam)
    if current_user.role == "STUDENT":
        q = q.where(Exam.is_active == True)
    # PROFESSOR and ADMIN see all exams
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
async def create_exam(
    payload: ExamCreate,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    exam = Exam(**payload.model_dump(), created_by=professor.id)
    db.add(exam)
    await db.flush()
    await ws_manager.broadcast_role("STUDENT", {
        "type": "NEW_EXAM",
        "title": exam.title,
        "exam_id": exam.id,
        "message": f"New exam available: {exam.title}",
    })
    return exam


@router.get("/{exam_id}", response_model=ExamOut)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if current_user.role == "STUDENT" and not exam.is_active:
        raise HTTPException(status_code=404, detail="Exam not found")
    if current_user.role == "PROFESSOR" and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return exam


@router.patch("/{exam_id}", response_model=ExamOut)
async def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if professor.role == "PROFESSOR" and exam.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    await db.flush()
    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if professor.role == "PROFESSOR" and exam.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(exam)
