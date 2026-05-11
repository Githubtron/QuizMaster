from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_admin
from models.category import Category
from models.user import User
from schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter()


@router.get("/", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Category))
    return result.scalars().all()


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Category).where(Category.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category name already exists")

    cat = Category(**payload.model_dump(), created_by=admin.id)
    db.add(cat)
    await db.flush()
    return cat


@router.get("/{category_id}", response_model=CategoryOut)
async def get_category(
    category_id: str,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.flush()
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(cat)
