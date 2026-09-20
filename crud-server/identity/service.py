from datetime import UTC, datetime, timedelta

import jwt
from werkzeug.security import check_password_hash, generate_password_hash

from config import Config
from db import SessionLocal
from identity.models import User
from identity.repository import create_user, get_user_by_email, get_user_by_username

TOKEN_TTL = timedelta(days=7)


class DuplicateUserError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def issue_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "exp": datetime.now(UTC) + TOKEN_TTL,
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def signup(*, username: str, email: str, password: str) -> tuple[User, str]:
    with SessionLocal() as session:
        if get_user_by_email(session, email) is not None:
            raise DuplicateUserError("Email is already registered")
        if get_user_by_username(session, username) is not None:
            raise DuplicateUserError("Username is already taken")

        user = create_user(
            session,
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
        )
        return user, issue_token(user)


def login(*, email: str, password: str) -> tuple[User, str]:
    with SessionLocal() as session:
        user = get_user_by_email(session, email)
        if user is None or not check_password_hash(user.password_hash, password):
            raise InvalidCredentialsError("Invalid email or password")
        return user, issue_token(user)
