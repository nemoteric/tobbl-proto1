from flask import Blueprint

threads = Blueprint('threads', __name__)
from . import views, forms