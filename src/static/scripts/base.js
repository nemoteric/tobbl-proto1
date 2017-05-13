
function base_socket() {
    var namespace = '/_base';
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
    return socket
}

function base_ready() {
    var socket = base_socket();

    socket.on('new_message', function(msg){ append_message(msg) });
    socket.on('get_group_messages', function(msgs){
        for (var m in msgs){
            append_message(msgs[m])
        }
    });
    socket.on('count_since_seen', function(num){ count_since_seen(num) });

    collapse_chat();
    socket.emit('count_since_seen')
}

function search() {
    var terms = $('#search').val();
    if (terms) {
        window.location = '/results?key=' + encodeURIComponent(terms)
    }
}

function expand_chat(){
    $('#chat_bar').remove();
    
    $(`<div id="chat_container"> ` +
      `      <a onclick="collapse_chat()">close</a>` +
      `      <div id="messages"></div>` +
      `      <div id="chat_reply_container">` +
      `          <textarea onkeydown="if (event.keyCode == 13) send_message()"></textarea>` +
      // `          <button onclick="send_msg()">Reply</button>` +
      `      </div>` +
      `</div>`
    ).appendTo($('#content'));
    
    base_socket().emit('get_group_messages')
}
function collapse_chat(){
    $('#chat_container').remove();

    $(`<div id="chat_bar">` +
      `    <a onclick="expand_chat() ">0 unread messages</a>` +
      `</div>`
    ).appendTo('#content')
}
function on_input(){
    var key = window.event.keyCode;
    console.log(key);
    if(key == 13) { //Enter keycode
        send_message();
    }
}

function send_message(){
    var textbox = $("#chat_reply_container textarea");
    base_socket().emit('group_message', textbox.val());
    textbox.val('')
}
function append_message(msg){
    var messages = $("#messages"),
        chatbar = $('#chat_bar a');
    chatbar.text(parseInt(chatbar.text().match(/\d+/))+1 + ' unread messages');
    
    $(`<div class='message'>` +
      `   <a class="author">${msg.author}:</a>` +
      `   <a class="body">${msg.body}</a>` +
      `</div>`
    ).appendTo(messages);

    messages.scrollTop(messages[0].scrollHeight);
}

function saw_message(){
    base_socket().emit('saw_messages')
}
function count_since_seen(num){
    $('#chat_bar a').text(num + ' unread messages');
}

