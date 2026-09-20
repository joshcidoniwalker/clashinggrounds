import os


class Config:
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
    ROOM_MIN_CAPACITY: int = 2
    ROOM_MAX_CAPACITY: int = 12
