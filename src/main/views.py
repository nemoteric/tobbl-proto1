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


## Note: redirecting to 'test.html' will produce an error if it doesn't exist.

# @main.route('/test')
# def test():
#     return render_template('test.html')
