from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_professor
from models.question import Question
from models.user import User
from schemas.question import QuestionCreate, QuestionOutAdmin, QuestionUpdate

router = APIRouter()


@router.get("/", response_model=list[QuestionOutAdmin])
async def list_questions(
    category_id: str | None = Query(default=None),
    difficulty: Literal["EASY", "MEDIUM", "HARD"] | None = Query(default=None),
    chapter: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    q = select(Question)
    # Professors see only their own questions; admins see all
    if professor.role == "PROFESSOR":
        q = q.where(Question.created_by == professor.id)
    if category_id:
        q = q.where(Question.category_id == category_id)
    if difficulty:
        q = q.where(Question.difficulty == difficulty)
    if chapter:
        q = q.where(Question.chapter == chapter)
    result = await db.execute(q.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=QuestionOutAdmin, status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionCreate,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    question = Question(**payload.model_dump(), created_by=professor.id)
    db.add(question)
    await db.flush()
    return question


@router.get("/{question_id}", response_model=QuestionOutAdmin)
async def get_question(
    question_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if professor.role == "PROFESSOR" and question.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return question


@router.patch("/{question_id}", response_model=QuestionOutAdmin)
async def update_question(
    question_id: str,
    payload: QuestionUpdate,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if professor.role == "PROFESSOR" and question.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    await db.flush()
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str,
    professor: User = Depends(require_professor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if professor.role == "PROFESSOR" and question.created_by != professor.id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(question)
