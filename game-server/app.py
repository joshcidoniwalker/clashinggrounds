# Must run before anything imports socket/ssl/threading; otherwise blocking I/O
# (e.g. the crud-server call during room creation) stalls every other request
# and socket event on the server.
from gevent import monkey

monkey.patch_all()

from flask import Flask
from flask_cors import CORS

from config import Config
from extensions import socketio
from room.routes import room_bp, rtc_bp
from room.sockets import register_socket_handlers


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=[Config.FRONTEND_ORIGIN])

    app.register_blueprint(room_bp)
    app.register_blueprint(rtc_bp)

    socketio.init_app(app)
    register_socket_handlers(socketio)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    flask_app = create_app()
    socketio.run(flask_app, host="0.0.0.0", port=5002, debug=True)
