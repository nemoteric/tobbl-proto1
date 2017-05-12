from .. import session
from flask_login import current_user
from time import time
from ..tools import get_uid


def search_by_keyword(keyword):
    results = list(
        session.run("MATCH (q:Question)<-[:ANSWER]-(p:Post)" +
                    "WHERE q.body CONTAINS {keyword} " +
                    "RETURN q,p ",
                    { "keyword": keyword }))

    results = [[res[0].properties, res[1].properties] for res in results]

    ids = []
    result_list = []
    for pair in results:
        if pair[0]['id'] not in ids:
            ids.append(pair[0]['id'])
            result_list.append({'question': {'body': pair[0]['body']},
                                 'answers': [{'body': pair[1]['body'],
                                              'score': pair[1]['score']}]})
        else:
            q = ids.index(pair[0]['id'])
            result_list[q]['answers'].append({'body': pair[1]['body'],
                                              'score': pair[1]['score']})
    return str(result_list)


def questions_and_answers():
    raw = list( session.run("MATCH (q:Question) "
                            "WITH q "
                            "OPTIONAL MATCH (q)<-[:ANSWER]-(p:Post) " +
                            "RETURN q,p "))

    results = []
    for res in raw:
        try:
            results.append([{**res[0].properties, 'id': res[0].id}, {**res[1].properties, 'id': res[1].id}])
        except:
            results.append([{**res[0].properties, 'id': res[0].id}, None])

    quids = []
    q_as = []
    for res in results:
        if res[0]['id'] not in quids:
            quids.append(res[0]['id'])
            q_as.append({**res[0], 'answers': [res[1]]})
        else:
            q = quids.index(res[0]['id'])
            q_as[q]['answers'].append(res[1])

    for q in range(len(q_as)):
        q_as[q]['answers'] = [a for a in q_as[q]['answers'] if a]
        q_as[q]['answers'] = sorted(q_as[q]['answers'], key=lambda x: x['score'], reverse=True)
        scores = []
        for a in range(len(q_as[q]['answers'])):
            scores.append(round(100*max(0,q_as[q]['answers'][a]['score']) /
                                sum([max(0,ans['score']) for ans in q_as[q]['answers']], 1e-10)))
        for a in range(len(q_as[q]['answers'])):
            q_as[q]['answers'][a]['score'] = scores[a]

    return q_as


def new_question(body):
    results = list(
        session.run('MATCH (U:User {username: {username}}) '
                    'CREATE (Q:Question { params })<-[:AUTHOR]-(U) '
                    'RETURN Q',
                    {'username': current_user.username,
                     'params': {'author': current_user.username,
                                'time': time(),
                                'body': body,
                                'score': 0,
                                'uid': get_uid('Question')
                    }}))[0][0]
    return {**results.properties, **{'id': results.id}}


def upvote(qid):
    results = list(
        session.run("MATCH (Q:Question), (U:User {username: {username}}) "
                    "WHERE ID(Q) = {qid} "
                    "MERGE (U)-[r:INTERACT]->(Q) "
                    "ON CREATE SET Q.score = Q.score + 1, r.click = 1 "
                    "ON MATCH SET Q.score = Q.score + 1 - 2 * r.click, r.click = 1 - r.click "
                    "RETURN Q, r",
                    {'qid': qid,
                     'username': current_user.username}))[0]

    return [{'uid': results[0].properties['uid'], 'score': results[0].properties['score']}], \
           {results[0].properties['uid']: results[1].properties['click']>0}


def question_clicks(quids):
    results = list(
        session.run('MATCH (U:User {username: {username}}), (Q:Question) '
                    'WHERE Q.uid in {quids} '
                    'WITH U,Q '
                    'OPTIONAL MATCH (U)-[r:INTERACT]->(Q) '
                    'RETURN Q,r ',
                    {'username': current_user.username,
                     'quids': quids}))

    clicks = {}
    for res in results:
        try:
            clicks[res[0].properties['uid']] = res[1].properties['click']>0
        except:
            clicks[res[0].properties['uid']] = False

    return clicks


def make_group_message(message):
    result = list(
        session.run("MATCH (U:User {username: {username}}) "
                    "MERGE (GC:GroupChat {id: 'global'})<-[r:SAW]-(U) "
                    "ON CREATE SET r.count_since_seen = 0 "
                    "WITH U,GC,r "
                    "MATCH (u:User)-[allR:SAW]->(GC) "
                    "SET allR.count_since_seen = allR.count_since_seen + 1, r.count_since_seen = 0 "
                    "WITH U,GC "
                    "CREATE (GC)<-[:ELEMENT_OF]-(M:Message { props })<-[:AUTHOR]-(U) "
                    "RETURN M ",
                    {'username': current_user.username,
                     'props':{'author': current_user.username,
                              'time': time(),
                              'body': message}}
        ))[0][0].properties
    return result


def get_group_messages():
    results = list(
        session.run("MATCH (U:User {username: {username}}) "
                    "WITH U "
                    "OPTIONAL MATCH (M:Message)-[:ELEMENT_OF]->(GC:GroupChat {id: 'global'}) "
                    "WITH M,U,GC "
                    "MERGE (U)-[r:SAW]->(GC) "
                    "SET r.count_since_seen = 0 "
                    "WITH M ORDER BY M.time LIMIT 200 "
                    "RETURN M ",
                    {'username': current_user.username}))
    return [res[0].properties for res in results]


def count_since_seen():
    return list(
        session.run("MATCH (U:User {username: {username}}), (GC:GroupChat {id: 'global'}) "
                    "WITH U,GC "
                    "OPTIONAL MATCH (GC)<-[:ELEMENT_OF]-(M:Message) "
                    "WITH U,GC, COUNT(M) as num "
                    "MERGE (U)-[r:SAW]->(GC) "
                    "ON CREATE SET r.count_since_seen = num "
                    "RETURN r",
                    {'username': current_user.username}))[0][0].properties['count_since_seen']