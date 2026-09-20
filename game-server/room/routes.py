from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

import room.service as service
from auth import require_auth
from room.schemas import CreateRoomRequest, DesignateSuccessorRequest, RoomDetail, RoomSummary

room_bp = Blueprint("room", __name__, url_prefix="/rooms")


@room_bp.get("")
@require_auth
def browse():
    rooms = service.browse_rooms()
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
            capacity=body.capacity,
            host_id=g.user["sub"],
            host_username=g.user["username"],
        )
    except service.InvalidCapacityError as exc:
        return jsonify(error=str(exc)), 400

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

    return jsonify(RoomDetail.from_room(room).model_dump())
