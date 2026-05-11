from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_admin
from core.security import hash_password
from models.attempt import Attempt
from models.exam import Exam
from models.user import User
from schemas.user import UserCreate, UserOut

router = APIRouter()


@router.get("/users", response_model=list[UserOut])
async def list_users(
    role: Literal["ADMIN", "PROFESSOR", "STUDENT"] | None = None,
    skip: int = 0,
    limit: int = 100,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(User)
    if role:
        q = q.where(User.role == role)
    result = await db.execute(q.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a PROFESSOR or STUDENT account with an explicit role."""
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.flush()


@router.get("/stats")
async def platform_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users    = (await db.execute(select(func.count(User.id)))).scalar()
    total_profs    = (await db.execute(select(func.count(User.id)).where(User.role == "PROFESSOR"))).scalar()
    total_students = (await db.execute(select(func.count(User.id)).where(User.role == "STUDENT"))).scalar()
    total_exams    = (await db.execute(select(func.count(Exam.id)))).scalar()
    total_attempts = (await db.execute(select(func.count(Attempt.id)))).scalar()
    submitted      = (await db.execute(
        select(func.count(Attempt.id)).where(Attempt.status.in_(["SUBMITTED", "TIMED_OUT"]))
    )).scalar()
    passed = (await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.status.in_(["SUBMITTED", "TIMED_OUT"]),
            Attempt.score >= 60,
        )
    )).scalar()

    return {
        "total_users":    total_users,
        "total_professors": total_profs,
        "total_students": total_students,
        "total_exams":    total_exams,
        "total_attempts": total_attempts,
        "submitted_attempts": submitted,
        "pass_count":     passed,
        "fail_count":     submitted - passed,
        "pass_rate":      round((passed / submitted * 100), 2) if submitted else 0,
    }
