from extensions import socketio
from room.models import Room
from room.schemas import RoomDetail


def broadcast_room_state(room_id: str, room: Room | None) -> None:
    if room is None:
        socketio.emit("room_closed", {"room_id": room_id}, to=room_id)
    else:
        socketio.emit("room_updated", RoomDetail.from_room(room).model_dump(), to=room_id)
