from dataclasses import dataclass


@dataclass
class Member:
    user_id: str
    username: str
    seat: int
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
    def member_count(self) -> int:
        return len(self.members)
