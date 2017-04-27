from src import db, session, lm
from operator import itemgetter
from functools import reduce

# neo4j
def get_uid(type):
    query = "MERGE (id:UniqueId{name:{type}}) " + \
        "ON CREATE SET id.count = 1 " + \
        "ON MATCH SET id.count = id.count + 1 " + \
        "RETURN id "
    return get_nodes(query, {'type': type})[0]['count']

def get_nodes(query, params=None, sortby=None, reverse=False, format=None,
              labels=False, relationships=False, clicks=True):
    query_results = list(session.run(query, params))
    results = [[item[i].properties for i in range(len(item))] for item in query_results]
    # if all(map(lambda x: len(x)==1,  results)):
    #     results = reduce(lambda x, y: x + y, results)
    if labels:
        for i in range(len(results)):
            results[i]['label'] = [e for e in query_results[i][0].labels][0].lower()
    if relationships:
        for i in range(len(results)):
            results[i]['relationship'] = query_results[i][1].type.lower()
    if clicks:
        pass
    if sortby:
        results = sorted(results, key=itemgetter(sortby), reverse=reverse)
    if format == 'json':
        dict = {}
        for item in results:
            if labels:
                dict[item['label'] + '_' + str(item['id'])] = item
            else:
                dict[item['id']] = item

        results = dict
    # if len(results)==1 and isinstance(results, list):
    #     return results[0]
    return results

def get_node_property(query, data, prop):
    prop = [item[0].properties[prop] for item in session.run(query, data)]
    return prop

#
# def make_comment(data):
#     if not data: ## left just in case something calls this that shouldn't, antiquated
#         raise ValueError('No data provided to make_comment')
#     id = get_uid('Comment')
#     comment = get_nodes('MATCH (u:User {username: {author}}), (p:%s {id: {parent_id}}) '
#                         'CREATE (u)-[:POSTED]->(c:Comment {props})'
#                         '<-[:CONTAINS]-(p) '
#                         'SET p.has_children = true '
#                         'RETURN c' % data['parent_type'].capitalize(),
#                         {'props': {'body': data['body'],
#                                    'score': 0,
#                                    'id': id,
#                                    'has_children': False,
#                                    'timestamp': time.time(),
#                                    'author': data['author']},
#                          'author': data['author'],
#                          'parent_id': int(data['parent_id'])})
#     return comment
#
# def make_prompt(data):
#     if not data: ## left just in case something calls this that shouldn't, antiquated
#         raise ValueError('No data provided to make_prompt')
#     id = get_uid('Prompt')
#     prompt = get_nodes('MATCH (u:User {username: {author}}), (p:%s {id: {parent_id}}) '
#                         'CREATE (u)-[:POSTED]->(c:Prompt {props})'
#                         '<-[:CONTAINS]-(p) '
#                         'SET p.has_children = true '
#                         'RETURN c' % data['parent_type'].capitalize(),
#                         {'props': {'body': data['body'],
#                                    'score': 0,
#                                    'id': id,
#                                    'has_children': False,
#                                    'has_responses': False,
#                                    'timestamp': time.time(),
#                                    'author': data['author']},
#                          'author': data['author'],
#                          'parent_id': int(data['parent_id'])})
#     return prompt
#
# def make_response(data):
#     if not data: ## left just in case something calls this that shouldn't, antiquated
#         raise ValueError('No data provided to make_response')
#     id = get_uid('Response')
#     response = get_nodes('MATCH (u:User {username: {author}}), '
#                          '(p:%s {id: {parent_id}}) '
#                          'CREATE (u)-[:POSTED]->(c:Response { props })'
#                          '<-[:%s]-(p) '
#                          'SET p.has_responses = true '
#                          'RETURN c' % (data['parent_type'].capitalize(),
#                                        data['response_type'].upper()),
#                          {'props': {'body': data['body'],
#                                     'score': 0,
#                                     'raw_score': 0,
#                                     'id': id,
#                                     'has_responses': False,
#                                     'timestamp': time.time(),
#                                     'author': data['author']},
#                          'author': data['author'],
#                          'parent_id': int(data['parent_id'])})
#
#     response['user_score'] = 0  # not intrinsic to node, but always 0 on start
#     response['relationship'] = data['response_type']
#     return response


# def get_thread_clicks(thread_id):
#     ## returns the a dict with the structure of the thread and the user's clicks
#       ## eventually figure out a query which will return the c.id and r.clicks whether
#        # or not r exists
#     def get_support_nodes(parent_type, parent_id):
#         supports = get_node_property('MATCH (:%s {id: {id}})-[:SUPPORT]->(c:Comment) '
#                                      'RETURN c' % parent_type,
#                                      {'id': parent_id},'id')
#         node = {}
#         for support in supports:
#             clicks = get_node_property('MATCH (:Comment {id: {id}})<-[r:CLICKED]-'
#                                        '(u:User {username: {username}}) '
#                                        'RETURN r',
#                                        {'id': support,
#                                         'username': current_user.username}, 'clicks')
#             if clicks:
#                 clicks = clicks[0]
#             node['comment_' + str(support)] = {'clicks': clicks or 0,
#                                                'Support': get_support_nodes('Comment', support),
#                                                'Challenge': get_challenge_nodes('Comment', support)}
#         return node
#
#     def get_challenge_nodes(parent_type, parent_id):
#         challenges = get_node_property('MATCH (:%s {id: {id}})-[:CHALLENGE]->(c:Comment) '
#                                        'RETURN c' % parent_type,
#                                        {'id': parent_id},'id')
#         node = {}
#         for challenge in challenges:
#             clicks = get_node_property('MATCH (:Comment {id: {id}})<-[r:CLICKED]-'
#                                        '(u:User {username: {username}}) '
#                                        'RETURN r',
#                                        {'id': challenge,
#                                         'username': current_user.username}, 'clicks')
#             if clicks:
#                 clicks = clicks[0]
#             node['comment_' + str(challenge)] = {'clicks': clicks or 0,
#                                                  'Support': get_support_nodes('Comment', challenge),
#                                                  'Challenge': get_challenge_nodes('Comment', challenge)}
#         return node
#
#     choices = get_node_property('MATCH (:Thread {id: {id}})-[:CONTAINS]->(c:Choice) '
#                            'RETURN c',
#                            {'id': thread_id},'id')
#     nodes = {}
#     for choice in choices:
#         clicks = get_node_property('MATCH (:Choice {id: {id}})<-[r:CLICKED]-'
#                                    '(u:User {username: {username}}) '
#                                    'RETURN r',
#                                    {'id': choice,
#                                     'username': current_user.username}, 'clicks')
#         if clicks:
#             clicks = clicks[0]
#         nodes['choice_' + str(choice)] = {'clicks': clicks or 0,
#                                           'Support': get_support_nodes('Choice', choice),
#                                            'Challenge': get_challenge_nodes('Choice', choice)}
#     return nodes
#
#
# def get_user_scores(thread_id):
#     def unwind(node, scores):
#         for key in node:
#             if key not in ['clicks','weighted']:
#                 scores[key] = {'score': node[key]['weighted'],
#                                'clicks': node[key]['clicks']}
#                 scores = unwind(node[key], scores)
#         return scores
#
#     def node_score(node):
#         score = {}
#         adjustment = 0
#
#         for key in node['Support'].keys():
#             score[key] = node_score(node['Support'][key])
#             adjustment += max(0, score[key]['adjusted'])
#         for key in node['Challenge'].keys():
#             score[key] = node_score(node['Challenge'][key])
#             adjustment -= max(0, score[key]['adjusted'])
#
#         p = sum([abs(score[key]['adjusted']) for key in score.keys()]) + .00001
#         for key in score.keys():
#             score[key]['weighted'] = round(score[key]['adjusted'] / p, 2)
#             del score[key]['adjusted']
#
#         score['adjusted'] = node['clicks'] + adjustment
#         score['clicks'] = node['clicks']
#         return score
#
#     nodes = get_thread_clicks(thread_id)
#     scores = {}
#     for choice in nodes.keys():
#         scores[choice] = node_score(nodes[choice])
#
#     p = sum([abs(scores[key]['adjusted']) for key in scores.keys()]) + .00001
#
#     unwound_scores = {}
#     for key in scores.keys():
#         scores[key]['weighted'] = round(scores[key]['adjusted'] / p, 2)
#         del scores[key]['adjusted']
#         unwound_scores[key] = {'score': scores[key]['weighted'],
#                                'clicks': scores[key]['clicks']}
#         unwound_scores = unwind(scores[key], unwound_scores)
#     return unwound_scores
#
#
# def update_get_global_scores(scores_before, scores_after):
#     scores = {}
#     for key in scores_after.keys():
#         diff = scores_after[key]['score'] - scores_before[key]['score']
#         type, id = key.split('_')
#
#         scores[key] = max(get_node_property('MATCH (c:%s {id: {id}}) '
#                                             'SET c.score = c.score + {val} '
#                                             'RETURN c'
#                                             % type.capitalize(),
#                                             {'id': int(id),
#                                             'val': diff}, 'score')[0], 0)
#     return scores
#
#
# def get_global_scores(thread_id):
#     def get_scores(parent_type, parent_id, scores):
#         comments = get_nodes('MATCH (t:$s {id: {id}})-'
#                              '[:CONTAINS]->(c:Comment) '
#                              'RETURN c' % parent_type,
#                              {'id': parent_id})
#         for comment in comments:
#             scores['comment_' + str(comment['id'])] = comment['score']
#             scores = get_scores('Comment', comment['id'])
#         return scores
#
#     choices = get_nodes('MATCH (t:Thread {id: {id}})-'
#                         '[:CONTAINS]->(c:Choice) '
#                         'RETURN c',
#                         {'id': thread_id})
#     scores = {}
#     for choice in choices:
#         scores['choice_' + str(choice)] = choice['score']
#         scores = get_scores('Choice', choice['id'], scores)
#     return scores

def update_response_scores(response_id):
    path = list(session.run('MATCH p=(n:Response {id: {id}})<-[r*]-(:Prompt) '
                            'RETURN p, r',
                            {'id': response_id}))
    scores = {}
    for rel in path[0]['r'][:-1]:
        start_id = rel.start
        end_id = rel.end
        rel = rel.type
        results = list(session.run('MATCH (c:Response) , (u:User {username: {username}}), (p:Response) '
                               'WHERE ID(c) = {end_id} AND ID(p) = {start_id} '
                               'MATCH (u)-[rc:CLICKED]->(c) '
                               'SET rc.adj = rc.clicks + rc.supp - rc.chal, '
                               '    rc.zero = CASE WHEN rc.adj < 0 THEN 0 ELSE rc.adj END '
                               'WITH c, p, u, rc '
                               'MERGE (p)-[:SUPPORT]->(S:Response)<-[rS:CLICKED]-(u) '
                               '    ON CREATE SET rS.supp=0, rS.chal=0, rS.score=0, rS.adj=0, rS.clicks=0, rS.zero=0,'
                               '         S.delete = true '
                               'WITH c, p, u, rc, sum(rS.zero) as sumS_0, sum(abs(rS.adj)) as sumS_adj '
                               'MERGE (p)-[:CHALLENGE]->(C:Response)<-[rC:CLICKED]-(u) '
                               '    ON CREATE SET rC.supp=0, rC.chal=0, rC.score=0, rC.adj=0, rC.clicks=0, rC.zero=0, '
                               '         C.delete = true '
                               'WITH c, p, u, rc, sum(rC.zero) as sumC_0, sum(abs(rC.adj)) as sumC_adj, sumS_0, sumS_adj '
                               # 'MATCH (u)-[:CLICKED]->(x:Response {delete: true}) '
                               # 'WITH c, p, u, rc, sumC_0, sumC_adj, sumS_0, sumS_adj, x '
                               # 'DELETE x '
                               # 'WITH c, p, u, rc, sumC_0, sumC_adj, sumS_0, sumS_adj '
                               'MERGE (u)-[rp:CLICKED]->(p) '
                               '    ON CREATE SET rp.clicks=0, rp.score=0 '
                               'WITH c, p, u, rc, sumC_0, sumC_adj, sumS_0, sumS_adj, rp '
                               'SET rp.chal = sumC_0, '
                               '    rp.supp = sumS_0,'
                               '    rp.adj = rp.clicks + rp.supp - rp.chal, '
                               '    rp.zero = CASE WHEN rp.adj < 0 THEN 0 ELSE rp.adj END '
                               'WITH c, p, u, rc, sumC_0, sumC_adj, sumS_0, sumS_adj, rp '
                               'MATCH (p)-[a]->(A:Response)<-[rA:CLICKED]-(u) '
                               '    SET rA.dscore = rA.score, '
                               '        rA.score = toFloat(rA.adj)/(sumC_adj + sumS_adj + 0.00001), '
                               '        rA.dscore = rA.score - rA.dscore, '
                               '        A.raw_score = A.raw_score + rA.dscore '
                               'WITH c, p, u, rc, sumC_0, sumC_adj, sumS_0, sumS_adj, rp, A '
                               'WITH sum(CASE WHEN A.raw_score > 0 THEN A.raw_score ELSE 0 END) as mag, p, u '
                               'MATCH (p)-[a]->(A:Response)<-[rA:CLICKED]-(u) '
                               'WITH A, mag '
                               '    SET A.score = CASE WHEN A.raw_score < 0 THEN 0 '
                               '        ELSE toFloat(A.raw_score)/(mag + 0.00001) END '
                               'WITH A, mag '
                               # 'MATCH (x:Response {delete: true}) '
                               # 'WITH A, mag, x '
                               # 'DELETE x '
                               # 'WITH A, mag, x '
                               'RETURN A.id as response_id, A.raw_score as raw_score, A.score as score, mag ',
                               {'username': current_user.username,
                                'start_id': start_id,
                                'end_id': end_id,
                                'rel': rel}))
        for res in results:
            if res['response_id']:
                scores[res['response_id']] = {'node_type': 'response', 'node_id': res['response_id'], 'score': res['score']}


    rel = path[0]['r'][-1]  ## Special circumstances for first responses to prompt
    start_id = rel.start
    end_id = rel.end
    rel = rel.type
    results = list(session.run('MATCH (c:Response) , (u:User {username: {username}}), (p:Prompt) '
                           'WHERE ID(c) = {end_id} AND ID(p) = {start_id} '
                           'MATCH (u)-[rc:CLICKED]->(c) '
                           'SET rc.adj = rc.clicks + rc.supp - rc.chal, '
                           '    rc.zero = CASE WHEN rc.adj < 0 THEN 0 ELSE rc.adj END '
                           'WITH c, p, u, rc '
                           'MERGE (p)-[:RESPOND]->(:Response)<-[rR:CLICKED]-(u) '
                           '    ON CREATE SET rR.supp=0, rR.chal=0, rR.score=0, rR.adj=0, rR.clicks=0, rR.zero=0 '
                           'WITH c, p, u, rc, sum(abs(rR.adj)) as sumR_adj '
                           'MATCH (p)-[:RESPOND]->(R:Response)<-[rR:CLICKED]-(u) '
                           '    SET rR.dscore = rR.score, '
                           '        rR.score = toFloat(rR.adj)/(sumR_adj + 0.00001), '
                           '        rR.dscore = rR.score - rR.dscore, '
                           '        R.raw_score = R.raw_score + rR.dscore '
                           'WITH p, u, R '
                           'WITH sum(CASE WHEN R.raw_score > 0 THEN R.raw_score ELSE 0 END) as mag, p, u '
                           'MATCH (p)-[a]->(R:Response)<-[rR:CLICKED]-(u) '
                           'WITH R, mag '
                           '    SET R.score = CASE WHEN R.raw_score < 0 THEN 0 '
                           '        ELSE toFloat(R.raw_score)/(mag + 0.00001) END '
                           'WITH R, mag '
                           'RETURN R.id as response_id, R.raw_score as raw_score, R.score as score, mag ',
                           {'username': current_user.username,
                            'start_id': start_id,
                            'end_id': end_id,
                            'rel': rel}))
    # print(results)
    for res in results:
        if res['response_id']:
            scores[res['response_id']] = {'node_type': 'response', 'node_id': res['response_id'], 'score': res['score']}
    session.run('MATCH ()-[r]->(x:Response {delete: true}) DELETE r, x')  ## annoying byproduct of the big query

    return scores





