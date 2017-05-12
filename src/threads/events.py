from .. import socketio
from .. import session
from flask_socketio import emit, join_room, leave_room, rooms
from . import thread_utils
import numpy as np

@socketio.on('connect', namespace='/_thread')
def connect():
    pass


@socketio.on('render_thread', namespace='/_thread')
def render_thread(thread_id):
    posts = get_nodes("MATCH (:Thread {id: {id}})-[:CONTAINS]->(p:Post) RETURN p",
                      {'id': int(thread_id)}, sortby='time')
    emit('render_thread', {'posts': posts})


@socketio.on('new_post', namespace='/_thread')
def new_post(json):
    post = thread_utils.new_post(json)
    if post:
        emit('new_post', post, room='question_%i' % json['question_uid'])


@socketio.on('upvote', namespace='/_thread')
def upvote(json):
    scores, clicks, quid = thread_utils.upvote(json)
    emit('update_scores', scores, room='question_%i' % quid)
    emit('update_clicks', clicks, room='question_%i' % quid)


@socketio.on('render_question', namespace='/_thread')
def render_thread(json):
    features, clicks = thread_utils.tobbl(json)
    join_room('question_%i' % json['question_uid'])
    emit('rooms', ','.join(rooms()))
    emit('render_question', [features, clicks])

@socketio.on('move_node', namespace='/_thread')
def move_node(json):
    thread_utils.move_node(json)
    emit('move_node', json, room='question_%i' % json['quid'])

