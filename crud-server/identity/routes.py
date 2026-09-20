from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from identity.schemas import LoginRequest, SignupRequest, TokenResponse, UserResponse
from identity.service import DuplicateUserError, InvalidCredentialsError, login, signup

identity_bp = Blueprint("identity", __name__, url_prefix="/identity")


@identity_bp.post("/signup")
def signup_route():
    try:
        body = SignupRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify(error=exc.errors()), 400

    try:
        user, token = signup(username=body.username, email=body.email, password=body.password)
    except DuplicateUserError as exc:
        return jsonify(error=str(exc)), 409

    response = TokenResponse(access_token=token, user=UserResponse.model_validate(user))
    return jsonify(response.model_dump()), 201


@identity_bp.post("/login")
def login_route():
    try:
        body = LoginRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return jsonify(error=exc.errors()), 400

    try:
        user, token = login(email=body.email, password=body.password)
    except InvalidCredentialsError as exc:
        return jsonify(error=str(exc)), 401

    response = TokenResponse(access_token=token, user=UserResponse.model_validate(user))
    return jsonify(response.model_dump()), 200
