import re
from time import time
from ..tools import get_nodes, get_uid
from flask_login import current_user
from flask import flash
from .. import session
import numpy as np


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

def get_question(question_id):
    query = "MATCH (Q:Question {id: {id}})<-[r*]-(p:Post) " + \
            "RETURN Q,r,p "
    params = {'id': int(question_id)}

    query_results = list(session.run(query, params))
    raw = [[item[i] for i in range(len(item))] for item in query_results]

    nodes = [{**node.properties, **{'id': node.id, 'type': list(node.labels)[0]}} for node in [raw[0][0]]+[r[2] for r in raw]]
    node_ids = []
    n=0
    while n < len(nodes):
        if nodes[n]['id'] in node_ids:
            del nodes[n]
        else:
            node_ids.append(nodes[n]['id'])
            n += 1

    edges = [{'source': edge.start, 'target': edge.end, 'type': edge.type} for edge in [r[1][-1] for r in raw]]

    ## Find nodes that should appear when an answer is selected
    def get_relevant(node, relevant):
        if 'answering' in nodes[node]:
            my_edges = [e for e in edges if e['target']==nodes[node]['id']]
        else:
            relevant.append(nodes[node]['id'])
            my_edges = [e for e in edges if e['source']==nodes[node]['id'] | e['target']==nodes[node]['id']]

        neighbors = [n for n in range(len(nodes)) if nodes[n]['id'] in [e['source'] for e in my_edges] + [e['target'] for e in my_edges]]
        for n in neighbors:
            if ('answering' not in nodes[n]) and (nodes[n]['id'] not in relevant):
                relevant = get_relevant(n,relevant)
        return relevant

    relevant_to_answers = dict([(nodes[n]['id'], get_relevant(n,[])) for n in range(len(nodes)) if 'answering' in nodes[n].keys()])
    return {'nodes': nodes, 'edges': edges, 'relevant': relevant_to_answers}


def new_post(json): # Should be able to do this in one query, but doing it for each edge-case for prototype
    refs = re.findall('([~\^!]*@[0-9]+)', json['body'])
    supporting = [int(ref[2:]) for ref in refs if re.match('\^', ref)]
    objecting = [int(ref[2:]) for ref in refs if re.match('!', ref)]
    answering = [int(ref[2:]) for ref in refs if re.match('~', ref)]
    replying = []#[int(ref[1:]) for ref in refs if re.match('@', ref)]

    json['body'] = re.sub('([~\^!]*@[0-9]+)', '', json['body']).strip()

    if re.match('(\?)', json['body']):
        if len(supporting) | len(objecting):
            flash("Can't support or object and also ask a question")
            return
        if 'thread_id' in json.keys():
            post = get_nodes("MATCH (t:Thread {id: {thread_id}}), (u:User {username: {username}}) " +
                             "CREATE (t)-[:CONTAINS]->(Q:Question { props })<-[:AUTHOR]-(u) " +
                             "SET Q.score = 0 " +
                             "RETURN Q", {'thread_id': int(json['thread_id']),
                                          'username': current_user.username,
                                          'props': {'body': json['body'][re.match('(\?)+', '?? eyy').span()[1]:].strip(),
                                                    'id': get_uid('Question'),
                                                    'author': current_user.username,
                                                    'time': time()}
                                          })[0]
        else:
            post = get_nodes("(u:User {username: {username}}) " +
                             "CREATE (Q:Question { props })<-[:AUTHOR]-(u) " +
                             "SET Q.score = 0 " +
                             "RETURN Q", {'username': current_user.username,
                                          'props': {
                                              'body': json['body'][re.match('(\?)+', '?? eyy').span()[1]:].strip(),
                                              'id': get_uid('Question'),
                                              'author': current_user.username,
                                              'time': time()}
                                          })[0]

    elif len(answering) & (len(supporting) | len(objecting)):
        flash("Can't support or object and also answer")
        return
    elif len(answering) == 1:
        post = get_nodes("MATCH (u:User {username: {username}}), (Q:Question {id: {answering}}) " +
                         "CREATE (A:Post { props })<-[:AUTHOR]-(u), (Q)<-[:ANSWER]-(A) " +
                         "SET A.score = 0 " +
                         "RETURN A", {'answering': answering,
                                      'username': current_user.username,
                                      'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'answering': True,
                                                'time': time()}
                                      })[0]
        print(post)
    elif len(supporting) & len(objecting) & len(replying):
        post = get_nodes("MATCH (u:User {username: {username}}), (sp:Post), (op:Post), (rp:Post) " +
                         "WHERE sp.id IN {supporting} AND op.id IN {objecting} AND rp.id IN {replying} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p), (op)<-[:OBJECT]-(p), (rp)<-[:REPLY]-(p) " +
                         "SET p.score = 0 " + \
                         "RETURN p",  {'supporting': supporting,
                                       'objecting': objecting,
                                       'replying': replying,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(supporting) & len(objecting):
        post = get_nodes("MATCH (u:User {username: {username}}), (sp:Post), (op:Post) " +
                         "WHERE sp.id IN {supporting} AND op.id IN {objecting} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p), (op)<-[:OBJECT]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p",  {'supporting': supporting,
                                       'objecting': objecting,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(supporting) & len(replying):
        post = get_nodes("MATCH (u:User {username: {username}}), (sp:Post), (rp:Post) " +
                         "WHERE sp.id IN {supporting} AND rp.id IN {replying} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p), (rp)<-[:REPLY]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p",  {'supporting': supporting,
                                       'replying': replying,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif len(objecting) & len(replying):
        post = get_nodes("MATCH (u:User {username: {username}}), (op:Post), (rp:Post) " +
                         "WHERE op.id IN {objecting} AND rp.id IN {replying} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (op)<-[:OBJECT]-(p), (rp)<-[:REPLY]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p", { 'replying': replying,
                                       'objecting': objecting,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif supporting:
        post = get_nodes("MATCH (u:User {username: {username}}), (sp:Post) " +
                         "WHERE sp.id IN {supporting} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (sp)<-[:SUPPORT]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p", { 'supporting': supporting,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif objecting:
        post = get_nodes("MATCH (u:User {username: {username}}), (op:Post) " +
                         "WHERE op.id IN {objecting} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (op)<-[:OBJECT]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p",  {'objecting': objecting,
                                       'username': current_user.username,
                                       'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    elif replying:
        ## new post with all replying relationships
        post = get_nodes("MATCH (u:User {username: {username}}), (rp:Post) " +
                         "WHERE rp.id IN {replying} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (rp)<-[:REPLY]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p", {'replying': replying,
                                      'username': current_user.username,
                                      'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    else:
        post = get_nodes("MATCH (u:User {username: {username}}) " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u) " +
                         "SET p.score = 0 " +
                         "RETURN p", {'username': current_user.username,
                                      'props': {'body': json['body'],
                                                'id': get_uid('Post'),
                                                'author': current_user.username,
                                                'type': 'Post',
                                                'time': time()}
                                      })[0]
    return post