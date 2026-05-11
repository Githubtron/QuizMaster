"""
Application configuration loaded from environment variables via Pydantic BaseSettings.
All secrets must be set in backend/.env — never hardcoded here.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        """Render (and some hosts) supply postgres:// or postgresql://.
        asyncpg requires the postgresql+asyncpg:// scheme — fix it here."""
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI providers
    OPENROUTER_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # App
    ENVIRONMENT: str = "development"

    # CORS — comma-separated allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Email (optional — leave blank to disable)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "QuizMaster <noreply@quizmaster.app>"
    SMTP_TLS: bool = True

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
