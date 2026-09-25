import os


class Config:
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
    ROOM_MIN_CAPACITY: int = 2
    ROOM_MAX_CAPACITY: int = 12
    CHAT_BUFFER_SIZE: int = 50
    CHAT_RATE_LIMIT_PER_MINUTE: int = 20
    ROOM_CREATE_RATE_LIMIT_PER_MINUTE: int = 5
    STUN_URL: str = os.environ.get("STUN_URL", "stun:localhost:3478")
    TURN_URL: str = os.environ.get("TURN_URL", "turn:localhost:3478")
    TURN_USERNAME: str = os.environ.get("TURN_USERNAME", "coturn")
    TURN_CREDENTIAL: str = os.environ.get("TURN_CREDENTIAL", "changeme")
