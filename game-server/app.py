from flask import Flask
from flask_socketio import SocketIO

from config import Config
from room.routes import room_bp
from room.sockets import register_socket_handlers

socketio = SocketIO(cors_allowed_origins="*", async_mode="gevent")


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    app.register_blueprint(room_bp)

    socketio.init_app(app)
    register_socket_handlers(socketio)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    flask_app = create_app()
    socketio.run(flask_app, host="0.0.0.0", port=5002, debug=True)
