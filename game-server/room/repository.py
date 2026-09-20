import time

from redis_client import redis_client

ROOMS_INDEX = "rooms:index"


def _room_key(room_id: str) -> str:
    return f"room:{room_id}"


def _member_order_key(room_id: str) -> str:
    return f"room:{room_id}:member_order"


def _member_names_key(room_id: str) -> str:
    return f"room:{room_id}:member_names"


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
    pipe.sadd(ROOMS_INDEX, room_id)
    pipe.execute()


def add_member(room_id: str, user_id: str, username: str) -> None:
    pipe = redis_client.pipeline()
    pipe.zadd(_member_order_key(room_id), {user_id: time.time()})
    pipe.hset(_member_names_key(room_id), user_id, username)
    pipe.execute()


def remove_member(room_id: str, user_id: str) -> None:
    pipe = redis_client.pipeline()
    pipe.zrem(_member_order_key(room_id), user_id)
    pipe.hdel(_member_names_key(room_id), user_id)
    pipe.execute()


def set_host(room_id: str, host_id: str) -> None:
    redis_client.hset(_room_key(room_id), "host_id", host_id)


def set_designated_successor(room_id: str, user_id: str | None) -> None:
    redis_client.hset(_room_key(room_id), "designated_successor_id", user_id or "")


def delete_room(room_id: str) -> None:
    pipe = redis_client.pipeline()
    pipe.delete(_room_key(room_id))
    pipe.delete(_member_order_key(room_id))
    pipe.delete(_member_names_key(room_id))
    pipe.srem(ROOMS_INDEX, room_id)
    pipe.execute()
