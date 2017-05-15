import re
from time import time
from ..tools import get_uid
from flask_login import current_user
from flask import flash
from .. import session
import numpy as np
import copy


def tobbl(element):
    features = {}
    if element['type']=='question':
        results = list(
            session.run("MATCH (Q:Question), (U:User {username: {username}}) "
                        "WHERE Q.uid={quid} "
                        "WITH Q,U "
                        "OPTIONAL MATCH (Q)<-[pR:ANSWER|CHALLENGE|SUPPORT|COMMENT*]-(P:Post) "
                        "WITH Q,U,pR,P "
                        "OPTIONAL MATCH (P)<-[uR:INTERACT]-(U) "
                        "RETURN pR,P,uR,Q ",
                        {'quid': element['question_uid'],
                         'username': current_user.username}))
        features['head'] = {'type': 'question',
                           'node': {'id': results[0][3].id, 'type': 'Question', **results[0][3].properties}}
        features['answerable'] = True; ## should be an attribute on node
    # if element['type']=='relationship':
    #     results = list(
    #         session.run("MATCH (Q:Question), (U:User {username: {username}}) "
    #                     "WHERE Q.uid={quid} "
    #                     "WITH Q,U "
    #                     "OPTIONAL MATCH (Q)<-[pR:ANSWER|CHALLENGE|SUPPORT*]-(P:Post) "
    #                     "WITH Q,U,pR,P "
    #                     "OPTIONAL MATCH (P)<-[uR:INTERACT]-(U) "
    #                     "RETURN pR,P,uR,Q ",
    #                     {'quid': element['question_uid'],
    #                      'username': current_user.username}))
    #     features['head'] = {'type': 'question',
    #                        'node': {'id': results[0][3].id, **results[0][3].properties}}
    #     features['answerable'] = True; ## should be an attribute on node


    nodes = [{**node.properties, 'id': node.id, 'type': list(node.labels)[0]}
             for node in [r[1] for r in results] if node is not None]

    node_ids = []
    n=0
    while n < len(nodes):
        if nodes[n]['id'] in node_ids:
            del nodes[n]
        else:
            node_ids.append(nodes[n]['id'])
            n += 1

    features['nodes'] = nodes

    edges = [{'source': edge.start, 'target': edge.end, 'type': edge.type}
             for edge in [r[0][-1] for r in results if r[0] is not None]]
    features['edges'] = edges


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
    features['relevant'] = dict([(nodes[n]['id'], get_relevant(n,[])) for n in range(len(nodes)) if 'answering' in nodes[n].keys()])

    clicks = {}
    for res in results:
        try:
            clicks[res[2].end] = res[2].properties['click']>0
        except:
            pass

    return features, clicks


def new_question(question):
    result = list(
        session.run("MATCH (U:User {username {username}}) "
                    "CREATE (Q:Question { props })<-[:AUTHOR]-(U) "
                    "RETURN Q ",
                    {'username': current_user.username,
                     'props': {
                         'author': current_user.username,
                         'time': time(),
                         'score': 0,
                         'body': question['body'],
                         'uid': get_uid('Question')
                     }}))[0]
    return {**result.properties, **{'id': results.id}}


def new_post(json): # Should be able to do this in one query, but doing it for each edge-case for prototype
    refs = re.findall('([~\^!]*@[0-9]+)', json['body'])
    supporting = [int(ref[2:]) for ref in refs if re.match('\^', ref)]
    challenging = [int(ref[2:]) for ref in refs if re.match('!', ref)]
    # answering = [int(ref[2:]) for ref in refs if re.match('~', ref)]
    commenting = [int(ref[1:]) for ref in refs if re.match('@', ref)]

    json['body'] = re.sub('([~\^!]*@[0-9]+)', '', json['body']).strip()


    if json['answering'] & (len(supporting) | len(challenging)):
        flash("Can't support or object and also answer")
        return

    elif json['answering']:
        results = list(
            session.run( "MATCH (u:User {username: {username}}), (Q:Question) " +
                         "WHERE Q.uid in {answering} " +
                         "CREATE (A:Post { props })<-[:AUTHOR]-(u), (Q)<-[rA:ANSWER]-(A) " +
                         "SET A.score = 0 " +
                         "RETURN A, rA", {'answering': json['question_uid'],
                                      'username': current_user.username,
                                      'props': {'body': json['body'],
                                                'uid': get_uid('Post'),
                                                'author': current_user.username,
                                                'answering': True,
                                                'time': time()}
                                      }))

        node = {**results[0][0].properties, **{'id': results[0][0].id}}
        rels = [{'source': results[0][1].start, 'target': results[0][1].end, 'type': results[0][1].type}]

    elif commenting:
        results = list(
            session.run("MATCH (u:User {username: {username}}), (cp:Post) " +
                        "WHERE ID(cp) IN {commenting} " +
                        "CREATE (cp)<-[rc:COMMENT]-(c:Post { props })<-[:AUTHOR]-(u) " +
                        "RETURN c,rc ",
                        {'commenting': commenting,
                         'username': current_user.username,
                         'props': {'body': json['body'],
                                   'uid': get_uid('Post'),
                                   'author': current_user.username,
                                   'type': 'Post',
                                   'commenting': True,
                                   'time': time()}
                         }))
        node = {**results[0][0].properties, **{'id': results[0][0].id, }}
        rels = [{'source': results[0][1].start, 'target': results[0][1].end, 'type': results[0][1].type}]

    elif len(supporting) & len(challenging):
        results = list(
            session.run( "MATCH (u:User {username: {username}}), (sp:Post), (op:Post) " +
                         "WHERE ID(sp) IN {supporting} AND ID(op) IN {challenging} " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u), (sp)<-[rS:SUPPORT]-(p), (op)<-[rC:CHALLENGE]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p,rS,rC ",
                          {'supporting': supporting,
                           'challenging': challenging,
                           'username': current_user.username,
                           'props': {'body': json['body'],
                                    'uid': get_uid('Post'),
                                    'author': current_user.username,
                                    'type': 'Post',
                                    'time': time()}
                                      }))
        node = {**results[0][0].properties, **{'id': results[0][0].id}}
        done = {}
        rels = []
        for res in results:
            print(res)
            print(len(res))
            for r in [res[1], res[2]]:
                if r.start in done:
                    if r.end not in done[r.start]:
                        done[r.start].append(r.end)
                        rels.append({'source': r.start, 'target': r.end, 'type': r.type})
                else:
                    done[r.start] = [r.end]
                    rels.append({'source': r.start, 'target': r.end, 'type': r.type})

    elif supporting:
        results = list(
            session.run( "MATCH (u:User {username: {username}}) " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u) " +
                         "WITH p " +
                         "MATCH (sp:Post) " +
                         "WHERE ID(sp) IN {supporting} " +
                         "CREATE (sp)<-[rS:SUPPORT]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p, rS",
                          {'supporting': supporting,
                           'username': current_user.username,
                           'props': {'body': json['body'],
                                    'uid': get_uid('Post'),
                                    'author': current_user.username,
                                    'type': 'Post',
                                    'time': time()}
                          }))
        node = {**results[0][0].properties, **{'id': results[0][0].id}}
        rels = [{'source': res[1].start, 'target': res[1].end, 'type': res[1].type} for res in results]

    elif challenging:
        results = list(
            session.run( "MATCH (u:User {username: {username}}) " +
                         "CREATE (p:Post { props })<-[:AUTHOR]-(u) " +
                         "WITH p " +
                         "MATCH (cp:Post) " +
                         "WHERE ID(cp) IN {challenging} " +
                         "CREATE (cp)<-[rC:CHALLENGE]-(p) " +
                         "SET p.score = 0 " +
                         "RETURN p, rC",
                          {'challenging': challenging,
                           'username': current_user.username,
                           'props': {'body': json['body'],
                                    'uid': get_uid('Post'),
                                    'author': current_user.username,
                                    'type': 'Post',
                                    'time': time()}
                          }))
        node = {**results[0][0].properties, **{'id': results[0][0].id}}
        rels = [{'source': res[1].start, 'target': res[1].end, 'type': res[1].type} for res in results]

    else:
        return

    return {'node': node, 'edges': rels}


def upvote(post_id):

    def update_score(id):
        rel = user_rels[id][0]
        dscore = rel['click'] + rel['sup'] - rel['chal'] - rel['score']
        rel['score'] += dscore
        if rel['score'] < 0:
            dscore = min(0,dscore-rel['score'])
        if (rel['score'] > 0) & (dscore > rel['score']):
            dscore = rel['score']

        if id in rels:
            for r in [r for r in rels[id] if r[1]!='ANSWER']:
                if r[1]=='SUPPORT':
                    user_rels[r[0]][0]['sup'] += dscore/len(rels[id])
                if r[1]=='CHALLENGE':
                    user_rels[r[0]][0]['chal'] += dscore/len(rels[id])
                update_score(r[0])


    results = list(
        session.run("MATCH (U:User {username: {username}}), (P:Post)-[:SUPPORT|CHALLENGE|ANSWER*]->(Q:Question) "
                    "WHERE ID(P) = {post_id} "
                    "MERGE (U)-[cR:INTERACT]->(P) "
                    "ON CREATE SET cR.click=0, cR.sup=0, cR.chal=0, cR.score=0 "
                    "WITH Q,U,P "
                    "OPTIONAL MATCH (P)-[:SUPPORT|CHALLENGE*]->(rP) "
                    "FOREACH (o IN CASE WHEN rP IS NOT NULL THEN [rP] ELSE [] END | "
                    "   MERGE (rP)<-[rR:INTERACT]-(U) "
                    "   ON CREATE SET rR.click=0, rR.sup=0, rR.score=0, rR.chal=0 "
                    ") "
                    "WITH U,Q "
                    "MATCH (U)-[iR:INTERACT]->(P:Post)-[allR:ANSWER|SUPPORT|CHALLENGE*]->(Q) "
                    "RETURN distinct iR, allR, Q ",
                    {'post_id': post_id,
                     'username': current_user.username}))

    rels = {}
    user_rels = {}
    ends = []
    if not results:
        results = list(
            session.run("MATCH (U:User {username: {username}}), (P:Post)-[:ANSWER]->(Q:Question) " +
                        "WHERE ID(P) = {post_id} "
                        "MERGE (P)<-[rU:INTERACT]-(U) " +
                        "ON CREATE SET rU.click = 0, rU.sup=0, rU.score=0, rU.chal=0 " +
                        "RETURN rU, Q ",
                        {'post_id': post_id,
                         'username': current_user.username}))

        quid = results[0][1].properties['uid']
        user_rels[post_id] = (results[0][0].properties, results[0][0].id)
    else:
        quid = results[0][2].properties['uid']
        for res in results:
            for r in res[1]:
                try:
                    if r.end not in [rel[0] for rel in rels[r.start]]:
                        rels[r.start].append((r.end, r.type))
                except:
                    rels[r.start] = [(r.end, r.type)]
                ends.append(r.end)
            user_rels[res[0].end] = (res[0].properties, res[0].id)

    orig_rels = copy.deepcopy(user_rels)

    ## Click or un-click the selected post
    if user_rels[post_id][0]['click'] > 0:
        user_rels[post_id][0]['click'] = 0
    else:
        user_rels[post_id][0]['click'] = 1

    ## split click share evenly
    clicked = [r for r in user_rels if user_rels[r][0]['click']>0]
    for r in clicked:
        user_rels[r][0]['click'] = 1/len(clicked)

    ## Update all nodes starting at highest nodes
    for s in [u for u in user_rels if u not in ends]:
        update_score(s)


    updated_rels = [{'id': user_rels[r][1], 'props': user_rels[r][0]} for r in user_rels]
    updated_scores = [{'id': r, 'dscore': user_rels[r][0]['score'] - orig_rels[r][0]['score']} for r in user_rels]

    click_res = list(
        session.run( "UNWIND { rels } AS rel " +
                     "MATCH ()-[r]-() " +
                     "WHERE ID(r) = rel.id " +
                     "SET r += rel.props "
                     "RETURN distinct r",
                    {'rels': updated_rels}))

    new_nodes = list(
        session.run("UNWIND { nodes } AS node " +
                     "MATCH (n) " +
                     "WHERE ID(n) = node.id " +
                     "SET n.score = round( 10^6 * (n.score + node.dscore)) / 10^6 "
                     "RETURN distinct n ",
                     {'rels': updated_rels,
                      'nodes': updated_scores}))

    clicks = {}
    for click in click_res:
        clicks[click[0].end] = click[0].properties['click']>0

    return [{'score': node[0].properties['score'], 'id': node[0].id} for node in new_nodes], clicks, quid


def move_node(node):
    session.run('MATCH (P:Post) '
                'WHERE ID(P)={id} '
                'SET P.x = {x}, P.y = {y} ',
                node)