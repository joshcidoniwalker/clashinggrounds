"""seed room categories

Revision ID: d50ab017aad5
Revises: d886ea88ca11
Create Date: 2026-09-25 15:02:00.185675

"""
from datetime import UTC, datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd50ab017aad5'
down_revision: Union[str, Sequence[str], None] = 'd886ea88ca11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# A lightweight table stub rather than the ORM model, so this migration keeps
# working after the model changes in later revisions.
room_categories = sa.table(
    "room_categories",
    sa.column("slug", sa.String),
    sa.column("name", sa.String),
    sa.column("sort_order", sa.Integer),
    sa.column("is_active", sa.Boolean),
    sa.column("is_default", sa.Boolean),
    sa.column("created_at", sa.DateTime(timezone=True)),
)

SEED = [
    ("just-chatting", "Just Chatting", 10, True),
    ("debate", "Debate", 20, False),
    ("hot-takes", "Hot Takes", 30, False),
    ("games", "Games", 40, False),
    ("show", "Show", 50, False),
    ("language-culture", "Language & Culture", 60, False),
    ("sports", "Sports", 70, False),
    ("other", "Other", 80, False),
]


def upgrade() -> None:
    """Seed the initial room categories."""
    now = datetime.now(UTC)
    op.bulk_insert(
        room_categories,
        [
            {
                "slug": slug,
                "name": name,
                "sort_order": sort_order,
                "is_active": True,
                "is_default": is_default,
                "created_at": now,
            }
            for slug, name, sort_order, is_default in SEED
        ],
    )


def downgrade() -> None:
    """Remove the seeded room categories."""
    slugs = [slug for slug, *_ in SEED]
    op.execute(room_categories.delete().where(room_categories.c.slug.in_(slugs)))
