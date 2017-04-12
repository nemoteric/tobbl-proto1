from .. import socketio
from flask_socketio import emit
from ..tools import get_nodes
from . import thread_utils

@socketio.on('connect', namespace='/_thread')
def connect():
    print('\n.\n.\n.\n.Connected to thread\n.\n.\n.\n.') # For debugging purposes

@socketio.on('render_thread', namespace='/_thread')
def render_thread(thread_id):
    posts = get_nodes("MATCH (:Thread {id: {id}})-[:CONTAINS]->(p:Post) RETURN p",
                      {'id': int(thread_id)}, sortby='time')
    emit('render_thread', {'posts': posts})

@socketio.on('new_post', namespace='/_thread')
def new_post(json):
    post = thread_utils.new_post(json)
    if post:
        emit('new_post', post)

@socketio.on('upvote', namespace='/_thread')
def upvote(json):
    scores = thread_utils.upvote(json)
    emit('update_scores', scores)

