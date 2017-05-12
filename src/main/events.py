from .. import socketio, session
from flask_socketio import emit, join_room, leave_room, rooms
from flask_login import current_user
from . import main_utils


@socketio.on('connect', namespace='/_home')
def connect():
    join_room('home')


@socketio.on('connect', namespace='/_base')
def connect():
    join_room('base')


@socketio.on('new_question', namespace='/_home')
def new_question(body):
    question = main_utils.new_question(body)
    emit('new_question', question, room='home')


@socketio.on('upvote', namespace='/_home')
def upvote(qid):
    scores, clicks = main_utils.upvote(qid)
    emit('update_scores', scores, room='home')
    emit('update_clicks', clicks)


@socketio.on('group_message', namespace='/_base')
def group_message(msg):
    emit('new_message', main_utils.make_group_message(msg), broadcast=True)


@socketio.on('get_group_messages', namespace='/_base')
def get_group_messages():
    emit('get_group_messages', main_utils.get_group_messages())


@socketio.on('count_since_seen', namespace='/_base')
def count_since_seen():
    emit('count_since_seen', main_utils.count_since_seen())
