import os
from time import time
from neo4j.v1 import GraphDatabase, basic_auth
# from src.tools import get_uid, get_nodes

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
    if len(results)==1 and isinstance(results, list):
        results = results[0]
    elif all(map(lambda x: len(x)==1,  results)):
        results = reduce(lambda x, y: x + y, results)
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

if __name__ == '__main__':
    url = os.environ.get('GRAPHENEDB_URL', 'http://localhost:7474')
    username = os.environ.get('NEO4J_USERNAME')
    password = os.environ.get('NEO4J_PASSWORD')

    driver = GraphDatabase.driver("bolt://localhost", auth=basic_auth(username, password))
    session = driver.session()

    session.run('CREATE (:User { params })',
                {'params': {'username': 'tobbl',
                            'id': get_uid('User')}})

    with open('test/sample_inputs.txt', 'r') as file:
        samples = '\n'.join(file.readlines()).strip().split(';;')

    while samples[-1] == '':
        samples = samples[:-1]

    for q, question in enumerate(samples):
        nodes = question.strip().split(';')
        ids = [get_uid('Question')]

        session.run('MATCH (U:User {username: "tobbl"}) ' +
                    'CREATE (:Question { params })<-[:AUTHOR]-(U)',
                    {'params':
                         {'body': nodes[0],
                          'id': ids[0],
                          'score': 0,
                          'time': time(),
                          'author': 'tobbl'}
                     })

        for n, node in enumerate(nodes[1:]):
            node = node.strip().split('\n\n')
            rels = [r.split(',') for r in node[1:]]

            ids.append(get_uid('Post'))

            if rels[0][0] == 'A':
                session.run('MATCH (Q:Question {id: {qid}}), (U:User {username: "tobbl"}) ' +
                            'CREATE (Q)<-[:ANSWER]-(:Post { params })<-[:AUTHOR]-(U)',
                            {'qid': ids[0],
                             'params': {'body': node[0],
                                        'time': time(),
                                        'score': 0,
                                        'author': 'tobbl',
                                        'answering': True,
                                        'id': ids[-1]}})
            else:
                if ('S' in [r[0] for r in rels] and 'C' in [r[0] for r in rels]):
                    session.run('MATCH (U:User {username: "tobbl"}), (S:Post), (C:Post) ' +
                                'WHERE S.id in {sids} AND C.id in {cids} ' +
                                'CREATE (P:Post { params })<-[:AUTHOR]-(U), ' +
                                '       (S)<-[:SUPPORT]-(P)-[:CHALLENGE]->(C)',
                                {'sids': [ids[int(r[1].strip())] for r in rels if r[0]=='S'],
                                 'cids': [ids[int(r[1].strip())] for r in rels if r[0]=='C'],
                                 'params': {'body': node[0],
                                            'time': time(),
                                            'score': 0,
                                            'author': 'tobbl',
                                            'id': ids[-1]}})
                elif ('S' in [r[0] for r in rels]):
                    session.run('MATCH (U:User {username: "tobbl"}), (S:Post) ' +
                                'WHERE S.id in { sids } ' +
                                'CREATE (S)<-[:SUPPORT]-(P:Post { params })<-[:AUTHOR]-(U) ',
                                {'sids': [ids[int(r[1].strip())] for r in rels if r[0] == 'S'],
                                 'params': {'body': node[0],
                                            'time': time(),
                                            'score': 0,
                                            'author': 'tobbl',
                                            'id': ids[-1]}})
                elif ('C' in [r[0] for r in rels]):
                    session.run('MATCH (U:User {username: "tobbl"}), (C:Post) ' +
                                'WHERE C.id in {cids} ' +
                                'CREATE (C)<-[:CHALLENGE]-(P:Post { params })<-[:AUTHOR]-(U) ',
                                {'cids': [ids[int(r[1].strip())] for r in rels if r[0] == 'S'],
                                 'params': {'body': node[0],
                                            'time': time(),
                                            'score': 0,
                                            'author': 'tobbl',
                                            'id': ids[-1]}})
                else:
                    print('No valid relationships for node that says:\n'+node[0])