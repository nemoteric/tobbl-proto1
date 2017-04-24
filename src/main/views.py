from flask import render_template
from flask_login import login_required
from src.main import main


@main.route('/')
@login_required
def home():
    return render_template('main/home.html')

@main.route('/search/<search_item>')
@login_required
def search(search_item):
    return render_template('main/search.html')


@main.route('/results')
def test():
    return render_template('main/results.html')
