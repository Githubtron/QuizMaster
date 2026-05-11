"""
FastAPI dependencies for authentication and authorization.
Inject `get_current_user` or `require_admin` into route handlers.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_access_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Validates the Bearer token and returns the User ORM object.
    Raises 401 if the token is missing, expired, or the user no longer exists.
    """
    # Import here to avoid circular import at module load time
    from models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def require_admin(current_user=Depends(get_current_user)):
    """Raises 403 if the authenticated user is not an ADMIN."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_professor(current_user=Depends(get_current_user)):
    """Raises 403 unless the user is PROFESSOR or ADMIN."""
    if current_user.role not in ("PROFESSOR", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professor or Admin access required",
        )
    return current_user


async def require_student(current_user=Depends(get_current_user)):
    """Raises 403 unless the user is STUDENT."""
    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return current_user
