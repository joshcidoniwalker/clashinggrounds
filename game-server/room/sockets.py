from flask import request
from flask_socketio import SocketIO
from flask_socketio import join_room as join_socketio_room
from pydantic import ValidationError

import room.service as service
from auth import InvalidTokenError, verify_token
from room.broadcast import broadcast_chat_message, broadcast_room_state, send_chat_history
from room.repository import is_member
from room.schemas import SendMessageRequest, SetMutedRequest, SignalRequest

# Maps a socket's session id to the (room_id, user_id) it's present in, so a
# disconnect (tab close, network drop) can trigger the same leave/host-handoff
# logic as an explicit REST leave.
_sid_presence: dict[str, tuple[str, str]] = {}

# The reverse of _sid_presence, so a WebRTC signal can be addressed to one
# specific peer rather than broadcast to the room. A second socket for the same
# user (another tab) displaces the first, which is also what the mesh wants:
# one peer connection per user.
_presence_sids: dict[tuple[str, str], str] = {}


def register_socket_handlers(socketio: SocketIO) -> None:
    @socketio.on("join_room")
    def handle_join_room(data):
        try:
            claims = verify_token(data.get("token", ""))
        except InvalidTokenError:
            socketio.emit("error", {"error": "Invalid token"}, to=request.sid)
            return

        room_id = data.get("room_id")
        user_id = claims["sub"]
        if not is_member(room_id, user_id):
            socketio.emit("error", {"error": "Not a member of this room"}, to=request.sid)
            return

        _sid_presence[request.sid] = (room_id, user_id)
        _presence_sids[(room_id, user_id)] = request.sid
        join_socketio_room(room_id)

        broadcast_room_state(room_id, service.get_room(room_id))
        send_chat_history(request.sid, service.get_chat_history(room_id))

    @socketio.on("send_message")
    def handle_send_message(data):
        try:
            claims = verify_token(data.get("token", ""))
        except InvalidTokenError:
            socketio.emit("error", {"error": "Invalid token"}, to=request.sid)
            return

        try:
            body = SendMessageRequest.model_validate(data).body
        except ValidationError:
            socketio.emit("error", {"error": "Invalid message"}, to=request.sid)
            return

        try:
            message = service.send_message(
                data.get("room_id"), claims["sub"], claims["username"], body
            )
        except (service.RoomNotFoundError, service.NotMemberError):
            socketio.emit("error", {"error": "Not a member of this room"}, to=request.sid)
            return
        except service.RateLimitedError:
            socketio.emit("error", {"error": "You're sending messages too quickly"}, to=request.sid)
            return

        broadcast_chat_message(message)

    @socketio.on("set_muted")
    def handle_set_muted(data):
        try:
            claims = verify_token(data.get("token", ""))
        except InvalidTokenError:
            socketio.emit("error", {"error": "Invalid token"}, to=request.sid)
            return

        try:
            muted = SetMutedRequest.model_validate(data).muted
        except ValidationError:
            socketio.emit("error", {"error": "Invalid mute state"}, to=request.sid)
            return

        room_id = data.get("room_id")
        try:
            room = service.set_muted(room_id, claims["sub"], muted)
        except (service.RoomNotFoundError, service.NotMemberError):
            socketio.emit("error", {"error": "Not a member of this room"}, to=request.sid)
            return

        broadcast_room_state(room_id, room)

    @socketio.on("webrtc_signal")
    def handle_webrtc_signal(data):
        """Relays one peer's SDP/ICE payload to another. The server never looks
        inside `signal` — it only checks both ends are members of the room."""
        try:
            claims = verify_token(data.get("token", ""))
        except InvalidTokenError:
            socketio.emit("error", {"error": "Invalid token"}, to=request.sid)
            return

        try:
            body = SignalRequest.model_validate(data)
        except ValidationError:
            socketio.emit("error", {"error": "Invalid signal"}, to=request.sid)
            return

        room_id = data.get("room_id")
        user_id = claims["sub"]
        if not is_member(room_id, user_id) or not is_member(room_id, body.target_user_id):
            socketio.emit("error", {"error": "Not a member of this room"}, to=request.sid)
            return

        target_sid = _presence_sids.get((room_id, body.target_user_id))
        if target_sid is None:
            return

        socketio.emit(
            "webrtc_signal",
            {"from_user_id": user_id, "signal": body.signal},
            to=target_sid,
        )

    @socketio.on("disconnect")
    def handle_disconnect():
        presence = _sid_presence.pop(request.sid, None)
        if presence is None:
            return

        room_id, user_id = presence
        if _presence_sids.get((room_id, user_id)) == request.sid:
            del _presence_sids[(room_id, user_id)]
        try:
            room = service.leave_room(room_id, user_id)
        except (service.RoomNotFoundError, service.NotMemberError):
            return

        broadcast_room_state(room_id, room)
