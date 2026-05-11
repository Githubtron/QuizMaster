"""
Async PostgreSQL connection via SQLAlchemy + asyncpg.
Provides engine, session factory, and Base for all ORM models.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from core.config import settings


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development"),
    pool_pre_ping=True,
    pool_size=5,       # Render free PostgreSQL allows ~25 connections total
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base — every model imports and inherits this."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields a DB session, always closes on exit."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
