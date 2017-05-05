from flask import Flask, Blueprint
from flask_bootstrap import Bootstrap
from flask_sqlalchemy import SQLAlchemy
from config import config
from flask_login import LoginManager
from flask_socketio import SocketIO
import os
from neo4j.v1 import GraphDatabase, basic_auth

socketio = SocketIO()      # websockets
bootstrap = Bootstrap()
db = SQLAlchemy()       # Relational database

url = os.environ.get('GRAPHENEDB_URL', 'http://localhost:7474')
username = os.environ.get('NEO4J_USERNAME')
password = os.environ.get('NEO4J_PASSWORD')

driver = GraphDatabase.driver("bolt://localhost", auth=basic_auth(username, password))
session = driver.session()

## Establish constraints on neo4j database
session.run('CREATE CONSTRAINT ON (u:User) '
            'ASSERT u.username IS UNIQUE')
# session.run('CREATE CONSTRAINT ON (t:Thread) '
#             'ASSERT t.id IS UNIQUE')
# session.run('CREATE CONSTRAINT ON (r:Response) '
#             'ASSERT r.id IS UNIQUE')
# session.run('CREATE CONSTRAINT ON (p:Prompt) '
#             'ASSERT p.id IS UNIQUE')
# session.run('CREATE CONSTRAINT ON (c:Comment) '
#             'ASSERT c.id IS UNIQUE')

auth = Blueprint('auth', __name__)
lm = LoginManager()
lm.session_protection = 'strong'
lm.login_view = 'auth.login'

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    bootstrap.init_app(app)
    db.init_app(app)
    lm.init_app(app)
    socketio.init_app(app)

    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from .threads import threads as threads_blueprint
    app.register_blueprint(threads_blueprint)

    # from .socket import socket as socket_blueprint
    # app.register_blueprint(socket_blueprint, url_prefix='/_socket')

    return app


