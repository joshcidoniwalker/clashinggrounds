import os


class Config:
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/crud"
    )
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
