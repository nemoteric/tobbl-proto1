from flask import render_template, request
from flask_login import login_required
from src.main import main
from .. import session
from . import main_utils


@main.route('/')
@login_required
def home():
    questions = main_utils.questions_and_answers()
    quids = [q['uid'] for q in questions]
    print(quids)
    return render_template('main/home.html',
                           questions=main_utils.questions_and_answers(),
                           clicks=main_utils.question_clicks(quids))


@main.route('/results')
@login_required
def search():
    return render_template('main/results.html')


@main.route('/api', methods=["GET"])
def api():
    return main_utils.search_by_keyword(request.args['keyword'])






