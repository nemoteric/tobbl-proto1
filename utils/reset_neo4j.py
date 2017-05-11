import os
from time import time
from neo4j.v1 import GraphDatabase, basic_auth

url = os.environ.get('GRAPHENEDB_URL', 'http://localhost:7474')
username = os.environ.get('NEO4J_USERNAME')
password = os.environ.get('NEO4J_PASSWORD')

driver = GraphDatabase.driver("bolt://localhost", auth=basic_auth(username, password))
session = driver.session()

print(list(session.run('MATCH (n)-[r]->(m) DELETE r DELETE n,m')))



