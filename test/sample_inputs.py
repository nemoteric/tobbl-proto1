import os
from time import time
from neo4j.v1 import GraphDatabase, basic_auth
# from src.tools import get_uid

def get_uid(type):
    query = "MERGE (id:UniqueId{name:{type}}) " + \
        "ON CREATE SET id.count = 1 " + \
        "ON MATCH SET id.count = id.count + 1 " + \
        "RETURN id "
    return list(session.run(query, {'type': type}))[0][0].properties['count']


if __name__ == '__main__':
    url = os.environ.get('GRAPHENEDB_URL', 'http://localhost:7474')
    username = os.environ.get('NEO4J_USERNAME')
    password = os.environ.get('NEO4J_PASSWORD')

    driver = GraphDatabase.driver("bolt://localhost", auth=basic_auth(username, password))
    session = driver.session()

    session.run('CREATE (:User { params })',
                {'params': {'username': 'tobbl',
                            'uid': get_uid('User')}})

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
                          'uid': ids[0],
                          'score': 0,
                          'time': time(),
                          'author': 'tobbl'}
                     })

        for n, node in enumerate(nodes[1:]):
            node = node.strip().split('\n\n')
            rels = [r.split(',') for r in node[1:]]

            ids.append(get_uid('Post'))

            if rels[0][0] == 'A':
                session.run('MATCH (Q:Question {uid: {quid}}), (U:User {username: "tobbl"}) ' +
                            'CREATE (Q)<-[:ANSWER]-(:Post { params })<-[:AUTHOR]-(U)',
                            {'quid': ids[0],
                             'params': {'body': node[0],
                                        'time': time(),
                                        'score': 0,
                                        'author': 'tobbl',
                                        'answering': True,
                                        'uid': ids[-1]}})
            else:
                if ('S' in [r[0] for r in rels] and 'C' in [r[0] for r in rels]):
                    session.run('MATCH (U:User {username: "tobbl"}), (S:Post), (C:Post) ' +
                                'WHERE S.uid in {sids} AND C.uid in {cids} ' +
                                'CREATE (P:Post { params })<-[:AUTHOR]-(U), ' +
                                '       (S)<-[:SUPPORT]-(P)-[:CHALLENGE]->(C)',
                                {'sids': [ids[int(r[1].strip())] for r in rels if r[0]=='S'],
                                 'cids': [ids[int(r[1].strip())] for r in rels if r[0]=='C'],
                                 'params': {'body': node[0],
                                            'time': time(),
                                            'score': 0,
                                            'author': 'tobbl',
                                            'uid': ids[-1]}})
                elif ('S' in [r[0] for r in rels]):
                    session.run('MATCH (U:User {username: "tobbl"}), (S:Post) ' +
                                'WHERE S.uid in { sids } ' +
                                'CREATE (S)<-[:SUPPORT]-(P:Post { params })<-[:AUTHOR]-(U) ',
                                {'sids': [ids[int(r[1].strip())] for r in rels if r[0] == 'S'],
                                 'params': {'body': node[0],
                                            'time': time(),
                                            'score': 0,
                                            'author': 'tobbl',
                                            'uid': ids[-1]}})
                elif ('C' in [r[0] for r in rels]):
                    session.run('MATCH (U:User {username: "tobbl"}), (C:Post) ' +
                                'WHERE C.uid in {cids} ' +
                                'CREATE (C)<-[:CHALLENGE]-(P:Post { params })<-[:AUTHOR]-(U) ',
                                {'cids': [ids[int(r[1].strip())] for r in rels if r[0] == 'S'],
                                 'params': {'body': node[0],
                                            'time': time(),
                                            'score': 0,
                                            'author': 'tobbl',
                                            'uid': ids[-1]}})
                else:
                    print('No valid relationships for node that says:\n'+node[0])