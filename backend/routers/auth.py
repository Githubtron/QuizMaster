from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import create_access_token, hash_password, verify_password
from models.user import User
from schemas.user import TokenResponse, UserCreate, UserLogin, UserOut

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="STUDENT",  # public registration always creates students
    )
    db.add(user)
    await db.flush()  # get the generated id before commit

    token = create_access_token(user.id, {"role": user.role, "email": user.email})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(user.id, {"role": user.role, "email": user.email})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))

@router.get("/seed-demo")
async def seed_demo_users(db: AsyncSession = Depends(get_db)):
    users = [
        {"email": "admin@demo.com", "password_hash": hash_password("admin1234"), "full_name": "Demo Admin", "role": "ADMIN"},
        {"email": "professor@demo.com", "password_hash": hash_password("prof1234"), "full_name": "Demo Professor", "role": "PROFESSOR"},
        {"email": "student@demo.com", "password_hash": hash_password("student1234"), "full_name": "Demo Student", "role": "STUDENT"},
    ]
    created = []
    for u in users:
        existing = await db.execute(select(User).where(User.email == u["email"]))
        if not existing.scalar_one_or_none():
            user = User(**u)
            db.add(user)
            created.append(u["email"])
    if created:
        await db.commit()
        return {"detail": f"Seeded users: {', '.join(created)}"}
    return {"detail": "Demo users already exist"}
