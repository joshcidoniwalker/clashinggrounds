from dataclasses import asdict
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from room.models import ChatMessage, Room


class CreateRoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    capacity: int = Field(ge=1, le=12)


class DesignateSuccessorRequest(BaseModel):
    user_id: str


class SendMessageRequest(BaseModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ChatMessageResponse(BaseModel):
    room_id: str
    sender_id: str
    sender_username: str
    body: str
    sent_at: str

    @classmethod
    def from_message(cls, message: ChatMessage) -> "ChatMessageResponse":
        return cls(**asdict(message))


class MemberResponse(BaseModel):
    user_id: str
    username: str


class RoomSummary(BaseModel):
    id: str
    name: str
    capacity: int
    member_count: int

    @classmethod
    def from_room(cls, room: Room) -> "RoomSummary":
        return cls(
            id=room.id, name=room.name, capacity=room.capacity, member_count=room.member_count
        )


class RoomDetail(BaseModel):
    id: str
    name: str
    capacity: int
    host_id: str
    designated_successor_id: str | None
    members: list[MemberResponse]

    @classmethod
    def from_room(cls, room: Room) -> "RoomDetail":
        return cls(
            id=room.id,
            name=room.name,
            capacity=room.capacity,
            host_id=room.host_id,
            designated_successor_id=room.designated_successor_id,
            members=[MemberResponse(user_id=m.user_id, username=m.username) for m in room.members],
        )
