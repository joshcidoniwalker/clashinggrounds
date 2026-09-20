from flask import request
from flask_socketio import SocketIO, emit
from flask_socketio import join_room as join_socketio_room

import room.service as service
from auth import InvalidTokenError, verify_token
from room.repository import is_member
from room.schemas import RoomDetail

# Maps a socket's session id to the (room_id, user_id) it's present in, so a
# disconnect (tab close, network drop) can trigger the same leave/host-handoff
# logic as an explicit REST leave.
_sid_presence: dict[str, tuple[str, str]] = {}


def register_socket_handlers(socketio: SocketIO) -> None:
    @socketio.on("join_room")
    def handle_join_room(data):
        try:
            claims = verify_token(data.get("token", ""))
        except InvalidTokenError:
            emit("error", {"error": "Invalid token"})
            return

        room_id = data.get("room_id")
        user_id = claims["sub"]
        if not is_member(room_id, user_id):
            emit("error", {"error": "Not a member of this room"})
            return

        _sid_presence[request.sid] = (room_id, user_id)
        join_socketio_room(room_id)

        room = service.get_room(room_id)
        emit("room_updated", RoomDetail.from_room(room).model_dump(), to=room_id)

    @socketio.on("disconnect")
    def handle_disconnect():
        presence = _sid_presence.pop(request.sid, None)
        if presence is None:
            return

        room_id, user_id = presence
        try:
            room = service.leave_room(room_id, user_id)
        except (service.RoomNotFoundError, service.NotMemberError):
            return

        if room is None:
            emit("room_closed", {"room_id": room_id}, to=room_id)
        else:
            emit("room_updated", RoomDetail.from_room(room).model_dump(), to=room_id)
