from flask_login import UserMixin, current_user
from src import db, session, lm
from werkzeug.security import generate_password_hash, check_password_hash
from operator import itemgetter

# System
@lm.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# Relational db
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(128), index=True, unique=True)

    password_hash = db.Column(db.String(128))

    def __repr__(self):
        return '<User %r>' % self.username

    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')

    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

