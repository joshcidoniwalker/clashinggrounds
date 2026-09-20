from flask_socketio import SocketIO

from config import Config

socketio = SocketIO(cors_allowed_origins=Config.FRONTEND_ORIGIN, async_mode="gevent")
