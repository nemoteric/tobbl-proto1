from ..tools import get_nodes
from .. import socketio, session
from flask_socketio import emit, join_room, leave_room, rooms
from flask_login import current_user

@socketio.on('connect', namespace='/_home')
def connect():
    print('\n.\n.\n.\n.Connected to main\n.\n.\n.\n.')
    threads = get_nodes('MATCH (t:Thread) RETURN t')
    print(threads)
    emit('render_home', threads)

