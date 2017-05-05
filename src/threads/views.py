from . import threads
from datetime import datetime
from flask import render_template, redirect, url_for, flash, jsonify, request
from flask_login import login_required, current_user
from ..tools import get_nodes, get_uid


@threads.route('/thread/new', methods=['GET','POST'])
@login_required
def new_thread():
    thread_id = get_uid('Thread')
    thread = get_nodes('MERGE (t:Thread {id: {id}}) RETURN t', {'id': int(thread_id)})
    return redirect('thread/%i' %thread_id)


@threads.route('/thread/<thread_id>', methods=['GET','POST'])
@login_required
def view_thread(thread_id):
    thread = get_nodes('MATCH (t:Thread) WHERE t.id={id} RETURN t LIMIT 1', {'id': int(thread_id)})
    if thread:
        print('thread')
        return render_template('threads/thread.html')
    else:
        flash('Thread does not exist')
        return render_template('main/home.html')


@threads.route('/thread/test', methods=['GET','POST'])
@login_required
def test():
    return render_template('test.html')


@threads.route('/thread/delete/<thread_id>')
def delete_thread(thread_id):
    thread = get_nodes('MATCH (t:Thread {id: {id}}) RETURN t', {'id': thread_id})
    if thread:
        session.run('MATCH (t:Thread {id: {id}})-[r]->(n) DELETE t,r,n',{'id': thread_id})
        flash('Thread ' + str(thread_id) + ' successfully deleted')
    else:
        flash('Thread ' + str(thread_id) + ' does not exist')
    return redirect(url_for('main.index'))


@threads.route('/q/<question_id>')
def render_question(question_id):
    return render_template('threads/question.html')
