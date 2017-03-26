from . import threads
from datetime import datetime
from flask import render_template, redirect, url_for, flash, jsonify, request
from flask_login import login_required, current_user
from .forms import NewThread
from ..models import get_nodes
from .. import db, session


# @threads.route('/new', methods=['GET','POST'])
# @login_required
# def new_thread():
#     if request.form:
#         print(request.form)
#         thread = make_thread({'author': current_user.username,
#                                       'body': request.form['question'],
#                                       'malleable': request.form['malleable']})
#         for el in request.form:
#             if 'choice' in el:
#                 make_choice({'body': request.form[el],
#                              'thread_id': thread['id'],
#                              'author': current_user.username})
#         return redirect('/thread/' + str(thread['id']))
#     return render_template('threads/new.html',
#                            title='New Thread')


@threads.route('/', methods=['GET','POST'])
def view_thread():
    # thread = get_nodes('MATCH (t:Thread) WHERE t.id={id} RETURN t LIMIT 1', {'id': int(thread_id)})

    # if thread:
    return render_template('threads/thread.html')

    # else:
    #     flash('The requested thread doesn\'t exist')
    #     return redirect('/')


# @threads.route('/delete/<thread_id>')
# def delete_thread(thread_id):
#     thread = get_nodes('MATCH (t:Thread {id: {id}}) RETURN t', {'id': thread_id})
#     if thread:
#         session.run('MATCH (t:Thread {id: {id}})-[r]->(n) DELETE t,r,n',{'id': thread_id})
#         flash('Thread ' + str(thread_id) + ' successfully deleted')
#     else:
#         flash('Thread ' + str(thread_id) + ' does not exist')
#     return redirect(url_for('main.index'))


