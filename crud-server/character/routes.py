from flask import Blueprint

character_bp = Blueprint("character", __name__, url_prefix="/characters")
