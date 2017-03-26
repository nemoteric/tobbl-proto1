# from ..models import get_nodes, make_response, make_comment, make_prompt, get_node_property, update_response_scores
from .. import socketio, session
from flask_socketio import emit, join_room, leave_room, rooms
from flask_login import current_user

@socketio.on('connect', namespace='/_home')
def connect():
    print('\n.\n.\n.\n.\n.\n.\n.Connected\n.\n.\n.\n.\n.\n.\n.')

