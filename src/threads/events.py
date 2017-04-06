from .. import socketio
from flask_socketio import emit
from ..tools import get_nodes, get_uid
from flask import request
from flask_login import current_user
from time import time

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
    post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}) " + \
                     "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u) " + \
                     "SET p.score = 0 " + \
                     "RETURN p", {'thread_id': int(json['thread_id']),
                                  'username': current_user.username,
                                  'props': {'body': json['body'],
                                            'id': get_uid('Post'),
                                            'author': current_user.username,
                                            'time': time()}
                                  })[0]
    emit('new_post', post)

