from sqlalchemy import select
from sqlalchemy.orm import Session

from room_category.models import RoomCategory


def list_active_categories(session: Session) -> list[RoomCategory]:
    query = (
        select(RoomCategory)
        .where(RoomCategory.is_active)
        .order_by(RoomCategory.sort_order, RoomCategory.name)
    )
    return list(session.scalars(query))
