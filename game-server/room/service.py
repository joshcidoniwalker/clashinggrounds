import uuid
from dataclasses import asdict
from datetime import UTC, datetime

import room.repository as repo
from config import Config
from room.models import ChatMessage, Member, Room


class RoomNotFoundError(Exception):
    pass


class RoomFullError(Exception):
    pass


class NotHostError(Exception):
    pass


class NotMemberError(Exception):
    pass


class InvalidCapacityError(Exception):
    pass


class RateLimitedError(Exception):
    pass


def _load_room(room_id: str) -> Room:
    fields = repo.get_room_fields(room_id)
    if fields is None:
        raise RoomNotFoundError(room_id)

    order = repo.get_member_order(room_id)
    names = repo.get_member_names(room_id)
    seats = repo.get_seats(room_id)
    muted = repo.get_muted(room_id)
    members = [
        Member(
            user_id=uid,
            username=names.get(uid, "unknown"),
            seat=seats[uid],
            muted=uid in muted,
        )
        for uid in order
    ]

    return Room(
        id=room_id,
        name=fields["name"],
        capacity=int(fields["capacity"]),
        host_id=fields["host_id"],
        designated_successor_id=fields["designated_successor_id"] or None,
        members=members,
    )


def get_room(room_id: str) -> Room:
    return _load_room(room_id)


def browse_rooms() -> list[Room]:
    return [_load_room(room_id) for room_id in repo.list_room_ids() if repo.room_exists(room_id)]


def create_room(*, name: str, capacity: int, host_id: str, host_username: str) -> Room:
    if not (Config.ROOM_MIN_CAPACITY <= capacity <= Config.ROOM_MAX_CAPACITY):
        raise InvalidCapacityError(
            f"Capacity must be between {Config.ROOM_MIN_CAPACITY} and {Config.ROOM_MAX_CAPACITY}"
        )
    if repo.increment_room_create_count(host_id) > Config.ROOM_CREATE_RATE_LIMIT_PER_MINUTE:
        raise RateLimitedError(host_id)

    room_id = uuid.uuid4().hex
    repo.create_room(
        room_id, name=name, capacity=capacity, host_id=host_id, host_username=host_username
    )
    return _load_room(room_id)


def join_room(room_id: str, user_id: str, username: str) -> Room:
    if not repo.room_exists(room_id):
        raise RoomNotFoundError(room_id)

    if repo.is_member(room_id, user_id):
        return _load_room(room_id)

    capacity = int(repo.get_room_fields(room_id)["capacity"])
    if repo.member_count(room_id) >= capacity:
        raise RoomFullError(room_id)

    repo.add_member(room_id, user_id, username, _lowest_free_seat(room_id, capacity))
    return _load_room(room_id)


def _lowest_free_seat(room_id: str, capacity: int) -> int:
    taken = set(repo.get_seats(room_id).values())
    return next(seat for seat in range(capacity) if seat not in taken)


def leave_room(room_id: str, user_id: str) -> Room | None:
    """Removes a member and runs host handoff/teardown. Returns the updated
    room, or None if the room was torn down because it's now empty."""
    if not repo.room_exists(room_id):
        raise RoomNotFoundError(room_id)

    room = _load_room(room_id)
    if not any(m.user_id == user_id for m in room.members):
        raise NotMemberError(user_id)

    repo.remove_member(room_id, user_id)

    if repo.member_count(room_id) == 0:
        repo.delete_room(room_id)
        return None

    if room.host_id == user_id:
        remaining = repo.get_member_order(room_id)
        successor = room.designated_successor_id
        new_host = successor if successor in remaining else remaining[0]
        repo.set_host(room_id, new_host)
        repo.set_designated_successor(room_id, None)

    return _load_room(room_id)


def designate_successor(room_id: str, host_id: str, target_user_id: str) -> Room:
    room = _load_room(room_id)
    if room.host_id != host_id:
        raise NotHostError(host_id)
    if not any(m.user_id == target_user_id for m in room.members):
        raise NotMemberError(target_user_id)

    repo.set_designated_successor(room_id, target_user_id)
    return _load_room(room_id)


def set_muted(room_id: str, user_id: str, muted: bool) -> Room:
    if not repo.room_exists(room_id):
        raise RoomNotFoundError(room_id)
    if not repo.is_member(room_id, user_id):
        raise NotMemberError(user_id)

    repo.set_muted(room_id, user_id, muted)
    return _load_room(room_id)


def send_message(room_id: str, user_id: str, username: str, body: str) -> ChatMessage:
    if not repo.room_exists(room_id):
        raise RoomNotFoundError(room_id)
    if not repo.is_member(room_id, user_id):
        raise NotMemberError(user_id)
    if repo.increment_chat_count(user_id) > Config.CHAT_RATE_LIMIT_PER_MINUTE:
        raise RateLimitedError(user_id)

    message = ChatMessage(
        room_id=room_id,
        sender_id=user_id,
        sender_username=username,
        body=body,
        sent_at=datetime.now(UTC).isoformat(),
    )
    repo.append_message(room_id, asdict(message))
    return message


def get_chat_history(room_id: str) -> list[ChatMessage]:
    return [ChatMessage(**fields) for fields in repo.get_messages(room_id)]
