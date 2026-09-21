from extensions import socketio
from room.models import ChatMessage, Room
from room.schemas import ChatMessageResponse, RoomDetail


def broadcast_room_state(room_id: str, room: Room | None) -> None:
    if room is None:
        socketio.emit("room_closed", {"room_id": room_id}, to=room_id)
    else:
        socketio.emit("room_updated", RoomDetail.from_room(room).model_dump(), to=room_id)


def broadcast_chat_message(message: ChatMessage) -> None:
    socketio.emit(
        "chat_message",
        ChatMessageResponse.from_message(message).model_dump(),
        to=message.room_id,
    )


def send_chat_history(sid: str, messages: list[ChatMessage]) -> None:
    socketio.emit(
        "chat_history",
        [ChatMessageResponse.from_message(m).model_dump() for m in messages],
        to=sid,
    )
