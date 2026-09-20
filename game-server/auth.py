from functools import wraps

import jwt
from flask import g, jsonify, request

from config import Config


class InvalidTokenError(Exception):
    pass


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify(error="Missing bearer token"), 401

        try:
            g.user = verify_token(auth_header.removeprefix("Bearer "))
        except InvalidTokenError as exc:
            return jsonify(error=str(exc)), 401

        return view(*args, **kwargs)

    return wrapped
