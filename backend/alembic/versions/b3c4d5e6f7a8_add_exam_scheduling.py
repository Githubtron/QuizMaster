"""add exam scheduling

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-05-10 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('exams', sa.Column('scheduled_start', sa.DateTime(timezone=True), nullable=True))
    op.add_column('exams', sa.Column('scheduled_end',   sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('exams', 'scheduled_end')
    op.drop_column('exams', 'scheduled_start')
