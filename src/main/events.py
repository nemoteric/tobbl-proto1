from .. import socketio, session
from flask_socketio import emit, join_room, leave_room, rooms
from flask_login import current_user
from . import main_utils


@socketio.on('connect', namespace='/_home')
def connect():
    join_room('home')


@socketio.on('new_question', namespace='/_home')
def new_question(body):
    question = main_utils.new_question(body)
    emit('new_question', question, room='home')


@socketio.on('upvote', namespace='/_home')
def upvote(qid):
    scores, clicks = main_utils.upvote(qid)
    emit('update_scores', scores, room='home')
    emit('update_clicks', clicks)
