from flask import Flask

from character.routes import character_bp
from config import Config
from identity.routes import identity_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    app.register_blueprint(identity_bp)
    app.register_blueprint(character_bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5001, debug=True)
