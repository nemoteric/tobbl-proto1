import re
from time import time
from ..tools import get_nodes, get_uid
from flask_login import current_user
from flask import flash
from .. import session
import numpy as np
import copy


def upvote(post_id):
    def update_score(id):
        rel = user_rels[id][0]
        dscore = (rel['click'] + rel['sup'] - rel['chal']) / max((rel['click'] + rel['sup'] + rel['chal']),.0001) - rel['score']
        rel['score'] += dscore
        if rel['score'] < 0:
            dscore -= rel['score']

        if id in rels:
            for r in rels[id]:
                if r[1]=='SUPPORT':
                    user_rels[r[0]][0]['sup'] += dscore/len(rels[id])
                if r[1]=='CHALLENGE':
                    user_rels[r[0]][0]['chal'] += dscore/len(rels[id])
                update_score(r[0])

    results = list(
        session.run("MATCH (U:User {username: {username}}), (P:Post)-[rP:SUPPORT|CHALLENGE*]->(C:Post) " +
                    "WHERE ID(P) = {post_id}"
                    "MERGE (P)<-[rU1:INTERACT]-(U) " +
                    "ON CREATE SET rU1.click = 0, rU1.sup=0, rU1.score=0, rU1.chal=0 " +
                    "WITH U,P,C,rP,rU1 " +
                    "MERGE (U)-[rU2:INTERACT]->(C) " +
                    "ON CREATE SET rU2.click=0, rU2.sup=0, rU2.score=0, rU2.chal=0 " +
                    "RETURN rP,rU1,rU2 ",
                    {'post_id': post_id,
                     'username': current_user.username}))

    rels = {}
    if not results:
        results = list(
            session.run("MATCH (U:User {username: {username}}), (P:Post) " +
                        "WHERE ID(P) = {post_id}"
                        "MERGE (P)<-[rU:INTERACT]-(U) " +
                        "ON CREATE SET rU.click = 0, rU.sup=0, rU.score=0, rU.chal=0 " +
                        "RETURN rU ",
                        {'post_id': post_id,
                         'username': current_user.username}))
        click = results[0][0].end
        user_rels = {click: (results[0][0].properties, results[0][0].id)}
    else:
        click = results[0][1].end
        user_rels = {click: (results[0][1].properties, results[0][1].id)}
        for res in results:
            for r in res[0]:
                try:
                    rels[r.start].append((r.end, r.type))
                except:
                    rels[r.start] = [(r.end, r.type)]
            user_rels[res[2].end] = (res[2].properties, res[2].id)

    orig_rels = copy.deepcopy(user_rels)

    user_rels[click][0]['click'] = 1 -  user_rels[click][0]['click']
    update_score(click)

    updated_rels = [{'id': user_rels[r][1], 'props': user_rels[r][0]} for r in user_rels]
    updated_scores = [{'id': r, 'dscore': user_rels[r][0]['score'] - orig_rels[r][0]['score']} for r in user_rels]

    clicks = list(
        session.run( "UNWIND { rels } AS rel " +
                     "MATCH ()-[r]-() " +
                     "WHERE ID(r) = rel.id " +
                     "SET r += rel.props "
                     "RETURN r",
                    {'rels': updated_rels}))

    new_nodes = list(
        session.run("UNWIND { nodes } AS node " +
                     "MATCH (n) " +
                     "WHERE ID(n) = node.id " +
                     "SET n.score = round( 10^6 * (n.score + node.dscore)) / 10^6 "
                     "RETURN n ",
                     {'rels': updated_rels,
                      'nodes': updated_scores}))

    return [[{'score': node[0].properties['score'], 'id': node[0].id} for node in new_nodes],
            [{'click': click[0].properties['click'], 'id': click[0].id} for click in clicks]]


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