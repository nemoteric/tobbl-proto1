/**
 * Created by samuel on 10/1/16.
 */
function open_socket(){
    var namespace = '/_thread';
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
    return socket
}

function thread_id() {return window.location.href.split('/')[4]}


function document_ready(){
    var socket = open_socket();
    
    socket.on('render_thread', function(json){
        render_thread(json)
    });

    socket.on('new_post', function(post){
        insert_post(post)
    });

    // socket.on('render_thread', function(json){
    //     var thread = json['thread'];
    //     $(`div#thread_${thread.id} > .thread_data .thread_title`).text(thread.body);
    //     var elements = json['elements'];
    //     for (var key in elements){
    //         if (elements.hasOwnProperty(key)){
    //             var el = elements[key];
    //             el['time'] = new Date(1000*el['timestamp']).toUTCString();
    //             if (el['label'] == 'comment'){
    //                 insert_comment(el, 'thread', thread.id)d
    //             }if (el['label'] == 'prompt'){
    //                 insert_prompt(el, 'thread', thread.id);
    //             }
    //         }
    //     }
    //     socket.emit('update_scores', 'Thread', json['thread_id'])
    // });

    socket.emit('render_thread', thread_id());
    console.log('here')
}


function render_thread(json){
    // This
    // delete all content
    // var content = document.getElementById("content");
    // while (content.firstChild) {
    //     content.removeChild(content.firstChild)}

    for (var post in json['posts']){
        insert_post(json['posts'][post])
    }
}

function insert_post(post){
    var post_div = document.getElementById("posts");
    var post_time = new Date(0);
    post_time.setUTCSeconds(post['time']);
    var current_time = new Date();
    // console.log(current_time.);

    var time = "%H%:%M% %m%/%d%/%y%";
    var elems = {'%H%': post_time.getHours(), '%M%': post_time.getMinutes(),// '%s%': post_time.getSeconds(),
                 '%m%': post_time.getMonth(), '%d%': post_time.getDate(), '%y%': post_time.getYear()};

    time = time.replace(/%\w+%/g, function(all) {
        return elems[all] || all;
    });

    console.log(post_time);
    $(  `<div class="post" id="${post['id']}">` +
        `   <div class="score_box">` +
        `      <button onclick="upvote(${post['id']})">+</button><br>` +
        `      <t id="score" class="post_score">${post['score']}</t>` +
        `   </div>` +
        `   <div class="post_body">` +
        `      <a class="post_id">${post['id']}:</a>` +
        `      <t class="post_body">${post['body']}</t>` +
        `   </div>` +
        `   <div class="post_footer">`+
        `      <a href="/user/${post['author']}" id="author">${post['author']}:</a>` +
        `      <t class="post_time">${time}</t>` +
        `   </div>` +
        `</div>`
    ).appendTo(post_div);
}

function submit_post(){
    var textbox = $(`div#reply_box > textarea`);
    open_socket().emit('new_post', {
        'body':textbox.val(),
        'thread_id': thread_id() // vulnerability
    });
    textbox.val('');
}

function upvote(post_id){
    open_socket().emit('upvote',{
        'post_id': post_id
    });
}