from flask import Blueprint, g

from auth import require_auth

room_bp = Blueprint("room", __name__, url_prefix="/rooms")


@room_bp.get("/me")
@require_auth
def me():
    return g.user
