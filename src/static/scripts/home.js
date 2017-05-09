/**
 * Created by samuel on 3/27/17.
 */

function open_socket(){
    var namespace = '/_home';
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
    return socket
}

function document_ready(){
    var socket = open_socket();

    socket.on('new_question', function(json){
        insert_question(json)
    });
    socket.on('update_scores', function(scores){
        update_scores(scores)
    });
    socket.on('update_clicks', function(clicks){
        update_clicks(clicks)
    });
}


function insert_question(question){
    $(`<div id="question_${ question.uid }" class="question_container">` +
      `  <div class="question">` +
      `      <div class="score_box">` +
      `          <a class="score">${question.score}</a>` +
      `          <button class="upvote" onclick="upvote(${question.id})">+</button>` +
      `      </div>` +
      `      <div class="content">` +
      `          <a class="body" href="/q/${question.uid}">${question.body}</a>` +
      `      </div>` +
      `  </div>` +
      `</div>`
    ).appendTo($('#questions'))
}

function ask_question(){
    $('#ask_question').hide();
    $('#new_question').show();
}

function submit_question(){
    open_socket().emit('new_question', $('#question_text').val())
    $('#question_text').val('')
}


function upvote(qid){
    open_socket().emit('upvote', qid)
}

function update_scores(scores){
    for (var s in scores){
        $(`#question_${ scores[s].uid } .question .score`).text(scores[s].score)
    }
}

function update_clicks(clicks){
    for (var c in clicks) {
        var button_val = '+'
        if (clicks[c]){ button_val = '-' }
        $(`#question_${ c } .question .upvote`).text(button_val)
    }
}