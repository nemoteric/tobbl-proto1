import re
from time import time
from ..tools import get_nodes, get_uid
from flask_login import current_user
from flask import flash


def upvote(json, root=True): # Should be able to do this in one query, but doing it iteratively for prototype
    if root:
        post = get_nodes("MATCH (p:Post {id: {id}}) "
                         "SET p.score = p.score + 1 "
                         "RETURN p", {'id': json['post_id']})
    else:
        post = get_nodes("MATCH (p:Post {id: {id}}) "
                         "SET p.score = p.score + 1 "
                         "RETURN p", {'id': json['post_id']})
    print(post)


def new_post(json): # Should be able to do this in one query, but doing it for each edge-case for prototype
    refs = re.findall('([~\^!]*@[0-9]+)', json['body'])
    support = [int(ref[2:]) for ref in refs if re.match('\^', ref)]
    object = [int(ref[2:]) for ref in refs if re.match('!', ref)]
    resolve = [int(ref[2:]) for ref in refs if re.match('~', ref)]
    reply = [int(ref[1:]) for ref in refs if re.match('@', ref)]

    if re.match('(\?)', json['body']):
        if len(support) | len(object):
            flash("Can't support or object and also open issue")
            return
        elif reply:
            post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (rp:Post) " + \
                             "WHERE rp.id IN {reply} " + \
                             "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (rp)<-[:REPLY]-(p) " + \
                             "SET p.score = 0 " + \
                             "RETURN p", {'thread_id': int(json['thread_id']),
                                          'reply': reply,
                                          'username': current_user.username,
                                          'props': {'body': json['body'][1:].strip(),
                                                    'id': get_uid('Post'),
                                                    'author': current_user.username,
                                                    'type': 'Issue',
                                                    'time': time()}
                                          })[0]
        else:
            post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}) " + \
                             "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u) " + \
                             "SET p.score = 0 " + \
                             "RETURN p", {'thread_id': int(json['thread_id']),
                                          'username': current_user.username,
                                          'props': {'body': json['body'][1:].strip(),
                                                    'id': get_uid('Post'),
                                                    'author': current_user.username,
                                                    'type': 'Issue',
                                                    'time': time()}
                                          })[0]
    elif len(resolve) & (len(support) | len(object)):
        flash("Can't support or object and also resolve")
        return
    elif len(resolve) & len(reply):
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (res:Post), (rp:Post) " + \
                         "WHERE res.id IN {resolve} AND rp.id IN {reply} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (res)<-[:RESOLVE]-(p), (rp)<-[:REPLY]-(p) " + \
                         "SET p.score = 0" + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'resolve': resolve,
                                       'reply': reply,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif resolve:
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (res:Post) " + \
                         "WHERE res.id IN {resolve} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (res)<-[:RESOLVE]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'resolve': resolve,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(support) & len(object) & len(reply):
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (sp:Post), (op:Post), (rp:Post) " + \
                         "WHERE sp.id IN {support} AND op.id IN {object} AND rp.id IN {reply} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p), (op)<-[:OBJECT]-(p), (rp)<-[:REPLY]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'support': support,
                                       'object': object,
                                       'reply': reply,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(support) & len(object):
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (sp:Post), (op:Post), " + \
                         "WHERE sp.id IN {support} AND op.id IN {object} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p), (op)<-[:OBJECT]-(p), " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'support': support,
                                       'object': object,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(support) & len(reply):
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (sp:Post), (rp:Post) " + \
                         "WHERE sp.id IN {support} AND rp.id IN {reply} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p), (rp)<-[:REPLY]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'support': support,
                                       'reply': reply,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(object) & len(reply):
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (op:Post), (rp:Post) " + \
                         "WHERE op.id IN {object} AND rp.id IN {reply} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (op)<-[:OBJECT]-(p), (rp)<-[:REPLY]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'reply': reply,
                                       'object': object,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif support:
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (sp:Post) " + \
                         "WHERE sp.id IN {support} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'support': support,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif object:
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (op:Post) " + \
                         "WHERE op.id IN {object} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (op)<-[:OBJECT]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                       'object': object,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif reply:
        ## new post with all REPLY relationships
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}), (rp:Post) " + \
                         "WHERE rp.id IN {reply} " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u), (rp)<-[:REPLY]-(p) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                      'reply': reply,
                                      'username': current_user.username,
                                      'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    else:
        post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}) " + \
                         "CREATE (t)-[:CONTAINS]->(p:Post { props })<-[:AUTHOR]-(u) " + \
                         "SET p.score = 0 " + \
                         "RETURN p", {'thread_id': int(json['thread_id']),
                                      'username': current_user.username,
                                      'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    return post