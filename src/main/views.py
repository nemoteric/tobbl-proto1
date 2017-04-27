from flask import render_template, request
from flask_login import login_required
from src.main import main
from ..tools import get_nodes


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

@main.route('/api', methods=["GET"])
def api():
    return search_by_keywork(request.args['keyword'])


def search_by_keywork(keyword):
    results = get_nodes("MATCH (n:Question) <- [A:ANSWER] -(p:Post)" +
                        "WHERE n.body CONTAINS {KeyWord} " +
                        "RETURN n,p ",
                        { "KeyWord": keyword })

    ids = []
    result_list = []
    for pair in results:
        if pair[0]['id'] not in ids:
            ids.append(pair[0]['id'])
            result_list.append({'question': {'body': pair[0]['body']},
                                 'answers': [{'body': pair[1]['body'],
                                              'score': pair[1]['score']}]})
        else:
            q = ids.index(pair[0]['id'])
            result_list[q]['answers'].append({'body': pair[1]['body'],
                                              'score': pair[1]['score']})
    return str(result_list)






