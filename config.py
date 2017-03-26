import os
basedir = os.path.abspath(os.path.dirname(__file__))

database_URI = {
    'development': 'sqlite:///' + os.path.join(basedir, 'dev.db'),
    'testing': 'sqlite:///' + os.path.join(basedir, 'test.db'),
    'production': 'sqlite:///' + os.path.join(basedir, 'mainApp.db'),
    'default': 'sqlite:///' + os.path.join(basedir, 'dev.db')
}

migrate_repo = {
    'development': os.path.join(basedir, 'dev_db_repo'),
    'testing': os.path.join(basedir, 'test_db_repo'),
    'production': os.path.join(basedir, 'db_repo'),
    'default': os.path.join(basedir, 'dev_db_repo')
}

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'this_needs_to_be_changed'
    SQLALCHEMY_COMMIT_ON_TEARDOWN = True
    WTF_CSRF_ENABLED = True
    SQLALCHEMY_TRACK_MODIFICATIONS = True


    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = database_URI['development']
    SQLALCHEMY_MIGRATE_REPO = migrate_repo['development']


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = database_URI['testing']
    SQLALCHEMY_MIGRATE_REPO = migrate_repo['testing']


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = database_URI['production']
    SQLALCHEMY_MIGRATE_REPO = migrate_repo['production']


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

