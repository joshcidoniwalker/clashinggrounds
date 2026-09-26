from flask import Flask
from flask_cors import CORS

from character.routes import character_bp
from config import Config
from identity.routes import identity_bp
from room_category.routes import room_category_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=[Config.FRONTEND_ORIGIN])

    app.register_blueprint(identity_bp)
    app.register_blueprint(character_bp)
    app.register_blueprint(room_category_bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5001, debug=True)
