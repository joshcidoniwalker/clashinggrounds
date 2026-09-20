from pydantic import BaseModel, Field

from room.models import Room


class CreateRoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    capacity: int = Field(ge=1, le=12)


class DesignateSuccessorRequest(BaseModel):
    user_id: str


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
