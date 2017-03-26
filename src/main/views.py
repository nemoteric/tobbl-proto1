from flask import render_template
from flask_login import login_required
from src.main import main


@main.route('/')
@login_required
def home():
    return render_template('main/index.html')


@main.route('/test')
def test():
    return render_template('test.html')