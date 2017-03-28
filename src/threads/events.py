from .. import socketio
from flask_socketio import emit
from ..tools import get_nodes

@socketio.on('connect', namespace='/_thread')
def connect():
    print('\n.\n.\n.\n.Connected to thread\n.\n.\n.\n.') # For debugging purposes




