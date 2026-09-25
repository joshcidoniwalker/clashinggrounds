import json
import time

from config import Config
from redis_client import redis_client

ROOMS_INDEX = "rooms:index"


def _room_key(room_id: str) -> str:
    return f"room:{room_id}"


def _member_order_key(room_id: str) -> str:
    return f"room:{room_id}:member_order"


def _member_names_key(room_id: str) -> str:
    return f"room:{room_id}:member_names"


def _seats_key(room_id: str) -> str:
    return f"room:{room_id}:seats"


def _muted_key(room_id: str) -> str:
    return f"room:{room_id}:muted"


def _chat_key(room_id: str) -> str:
    return f"room:{room_id}:chat"


def _chat_rate_key(user_id: str) -> str:
    return f"rate:chat:{user_id}"


def _room_create_rate_key(user_id: str) -> str:
    return f"rate:room_create:{user_id}"


def room_exists(room_id: str) -> bool:
    return redis_client.exists(_room_key(room_id)) == 1


def get_room_fields(room_id: str) -> dict | None:
    fields = redis_client.hgetall(_room_key(room_id))
    return fields or None


def list_room_ids() -> list[str]:
    return list(redis_client.smembers(ROOMS_INDEX))


def get_member_order(room_id: str) -> list[str]:
    """Oldest (longest-tenured) member first."""
    return redis_client.zrange(_member_order_key(room_id), 0, -1)


def get_member_names(room_id: str) -> dict[str, str]:
    return redis_client.hgetall(_member_names_key(room_id))


def get_seats(room_id: str) -> dict[str, int]:
    return {uid: int(seat) for uid, seat in redis_client.hgetall(_seats_key(room_id)).items()}


def get_muted(room_id: str) -> set[str]:
    return redis_client.smembers(_muted_key(room_id))


def member_count(room_id: str) -> int:
    return redis_client.zcard(_member_order_key(room_id))


def is_member(room_id: str, user_id: str) -> bool:
    return redis_client.zscore(_member_order_key(room_id), user_id) is not None


def create_room(
    room_id: str, *, name: str, capacity: int, host_id: str, host_username: str
) -> None:
    pipe = redis_client.pipeline()
    pipe.hset(
        _room_key(room_id),
        mapping={
            "name": name,
            "capacity": capacity,
            "host_id": host_id,
            "designated_successor_id": "",
            "created_at": time.time(),
        },
    )
    pipe.zadd(_member_order_key(room_id), {host_id: time.time()})
    pipe.hset(_member_names_key(room_id), host_id, host_username)
    pipe.hset(_seats_key(room_id), host_id, 0)
    pipe.sadd(ROOMS_INDEX, room_id)
    pipe.execute()


def add_member(room_id: str, user_id: str, username: str, seat: int) -> None:
    pipe = redis_client.pipeline()
    pipe.zadd(_member_order_key(room_id), {user_id: time.time()})
    pipe.hset(_member_names_key(room_id), user_id, username)
    pipe.hset(_seats_key(room_id), user_id, seat)
    pipe.execute()


def remove_member(room_id: str, user_id: str) -> None:
    pipe = redis_client.pipeline()
    pipe.zrem(_member_order_key(room_id), user_id)
    pipe.hdel(_member_names_key(room_id), user_id)
    pipe.hdel(_seats_key(room_id), user_id)
    pipe.srem(_muted_key(room_id), user_id)
    pipe.execute()


def set_muted(room_id: str, user_id: str, muted: bool) -> None:
    if muted:
        redis_client.sadd(_muted_key(room_id), user_id)
    else:
        redis_client.srem(_muted_key(room_id), user_id)


def set_host(room_id: str, host_id: str) -> None:
    redis_client.hset(_room_key(room_id), "host_id", host_id)


def set_designated_successor(room_id: str, user_id: str | None) -> None:
    redis_client.hset(_room_key(room_id), "designated_successor_id", user_id or "")


def delete_room(room_id: str) -> None:
    pipe = redis_client.pipeline()
    pipe.delete(_room_key(room_id))
    pipe.delete(_member_order_key(room_id))
    pipe.delete(_member_names_key(room_id))
    pipe.delete(_seats_key(room_id))
    pipe.delete(_muted_key(room_id))
    pipe.delete(_chat_key(room_id))
    pipe.srem(ROOMS_INDEX, room_id)
    pipe.execute()


def append_message(room_id: str, message: dict) -> None:
    pipe = redis_client.pipeline()
    pipe.rpush(_chat_key(room_id), json.dumps(message))
    pipe.ltrim(_chat_key(room_id), -Config.CHAT_BUFFER_SIZE, -1)
    pipe.execute()


def get_messages(room_id: str) -> list[dict]:
    """Oldest message first."""
    return [json.loads(raw) for raw in redis_client.lrange(_chat_key(room_id), 0, -1)]


def _increment_fixed_window(key: str) -> int:
    """Fixed one-minute window: the TTL is set when the window's first action
    lands, so the count expires a minute after that rather than sliding."""
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, 60)
    return count


def increment_chat_count(user_id: str) -> int:
    return _increment_fixed_window(_chat_rate_key(user_id))


def increment_room_create_count(user_id: str) -> int:
    return _increment_fixed_window(_room_create_rate_key(user_id))
