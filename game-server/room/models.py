from dataclasses import dataclass


@dataclass
class Member:
    user_id: str
    username: str
    seat: int | None
    muted: bool


@dataclass
class ChatMessage:
    room_id: str
    sender_id: str
    sender_username: str
    body: str
    sent_at: str


@dataclass
class Category:
    slug: str
    name: str


@dataclass
class Room:
    id: str
    name: str
    category: Category
    capacity: int
    host_id: str
    designated_successor_id: str | None
    members: list[Member]

    @property
    def speaker_count(self) -> int:
        return sum(1 for m in self.members if m.seat is not None)

    @property
    def audience_count(self) -> int:
        return len(self.members) - self.speaker_count
