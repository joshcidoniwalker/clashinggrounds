import os


class Config:
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
