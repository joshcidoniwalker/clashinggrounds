from db import SessionLocal
from room_category.models import RoomCategory
from room_category.repository import list_active_categories


def get_active_categories() -> list[RoomCategory]:
    with SessionLocal() as session:
        return list_active_categories(session)
