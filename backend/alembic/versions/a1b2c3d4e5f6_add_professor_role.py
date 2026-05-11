"""add_professor_role

Revision ID: a1b2c3d4e5f6
Revises: 5c5b7e520b07
Create Date: 2026-05-10 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5c5b7e520b07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL: add the new value to the existing enum type
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PROFESSOR'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values directly.
    # Recreate the type without PROFESSOR and migrate the column.
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20)")
    op.execute("DROP TYPE user_role")
    op.execute("CREATE TYPE user_role AS ENUM ('ADMIN', 'STUDENT')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role"
    )
