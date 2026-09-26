from flask import Blueprint, jsonify

from room_category.schemas import RoomCategoryResponse
from room_category.service import get_active_categories

room_category_bp = Blueprint("room_category", __name__, url_prefix="/room-categories")


# Public: the logged-out landing page shows category filters, and the game-server
# calls this without a user token to validate room creation.
@room_category_bp.get("")
def list_categories():
    categories = get_active_categories()
    return jsonify([RoomCategoryResponse.model_validate(c).model_dump() for c in categories])
