from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

import room.service as service
from auth import require_auth
from config import Config
from room.broadcast import broadcast_room_state
from room.category_client import CategoriesUnavailableError
from room.schemas import (
    CreateRoomRequest,
    DesignateSuccessorRequest,
    IceServer,
    RoomDetail,
    RoomSummary,
)

room_bp = Blueprint("room", __name__, url_prefix="/rooms")
rtc_bp = Blueprint("rtc", __name__, url_prefix="/rtc")


@rtc_bp.get("/ice-servers")
@require_auth
def ice_servers():
    servers = [
        IceServer(urls=Config.STUN_URL),
        IceServer(
            urls=Config.TURN_URL,
            username=Config.TURN_USERNAME,
            credential=Config.TURN_CREDENTIAL,
        ),
    ]
    # A null username/credential on the STUN entry is not merely redundant —
    # some browsers reject the RTCIceServer outright rather than ignoring it.
    return jsonify([s.model_dump(exclude_none=True) for s in servers])


# Public so the landing page can show logged-out visitors what's open. A
# summary carries no member identities; joining still requires a token.
@room_bp.get("")
def browse():
    rooms = service.browse_rooms(request.args.get("category"))
    return jsonify([RoomSummary.from_room(r).model_dump() for r in rooms])


@room_bp.post("")
@require_auth
def create():
    try:
        body = CreateRoomRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify(error=exc.errors()), 400

    try:
        room = service.create_room(
            name=body.name,
            category_slug=body.category,
            capacity=body.capacity,
            host_id=g.user["sub"],
            host_username=g.user["username"],
        )
    except service.InvalidCapacityError as exc:
        return jsonify(error=str(exc)), 400
    except service.UnknownCategoryError:
        return jsonify(error="Unknown category"), 400
    except CategoriesUnavailableError:
        return jsonify(error="Room creation is temporarily unavailable"), 503
    except service.RateLimitedError:
        return jsonify(error="You're creating rooms too quickly — try again in a minute"), 429

    return jsonify(RoomDetail.from_room(room).model_dump()), 201


@room_bp.get("/<room_id>")
@require_auth
def detail(room_id: str):
    try:
        room = service.get_room(room_id)
    except service.RoomNotFoundError:
        return jsonify(error="Room not found"), 404

    return jsonify(RoomDetail.from_room(room).model_dump())


@room_bp.post("/<room_id>/join")
@require_auth
def join(room_id: str):
    try:
        room = service.join_room(room_id, g.user["sub"], g.user["username"])
    except service.RoomNotFoundError:
        return jsonify(error="Room not found"), 404
    except service.RoomFullError:
        return jsonify(error="Room is full"), 409

    return jsonify(RoomDetail.from_room(room).model_dump())


@room_bp.post("/<room_id>/leave")
@require_auth
def leave(room_id: str):
    try:
        room = service.leave_room(room_id, g.user["sub"])
    except service.RoomNotFoundError:
        return jsonify(error="Room not found"), 404
    except service.NotMemberError:
        return jsonify(error="Not a member of this room"), 403

    broadcast_room_state(room_id, room)
    return jsonify(RoomDetail.from_room(room).model_dump() if room else None)


@room_bp.post("/<room_id>/designate-successor")
@require_auth
def designate_successor(room_id: str):
    try:
        body = DesignateSuccessorRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify(error=exc.errors()), 400

    try:
        room = service.designate_successor(room_id, g.user["sub"], body.user_id)
    except service.RoomNotFoundError:
        return jsonify(error="Room not found"), 404
    except service.NotHostError:
        return jsonify(error="Only the host can designate a successor"), 403
    except service.NotMemberError:
        return jsonify(error="Target user is not a member of this room"), 400

    broadcast_room_state(room_id, room)
    return jsonify(RoomDetail.from_room(room).model_dump())
