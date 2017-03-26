/**
 * Created by samuel on 10/1/16.
 */
function open_socket(){
    var namespace = '/_home';
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
    return socket
}
function print(msg){$('#server_responses').prepend('<br>' + $('<div/>').text(msg).html());}

function document_ready(){
    var socket = open_socket();

    socket.on('render_home', function(json){
        var communities = json['communities'];
        for (var key in communities){
            if (communities.hasOwnProperty(key)){
                var community = communities[key];
                insert_communityview(community)
            }
        }
    });
    socket.on('render_community', function(json){
        var threads = json['threads'];
        for (var key in threads){
            if (threads.hasOwnProperty(key)){
                var thread = threads[key];
                insert_threadview(thread, json.community_id)
            }
        }
    });
    socket.on('render_thread', function(json){
        var thread = json['thread'];
        $(`div#thread_${thread.id} > .thread_data .thread_title`).text(thread.body);
        var elements = json['elements'];
        for (var key in elements){
            if (elements.hasOwnProperty(key)){
                var el = elements[key];
                el['time'] = new Date(1000*el['timestamp']).toUTCString();
                if (el['label'] == 'comment'){
                    insert_comment(el, 'thread', thread.id)
                }if (el['label'] == 'prompt'){
                    insert_prompt(el, 'thread', thread.id);
                }
            }
        }
        socket.emit('update_scores', 'Thread', json['thread_id'])
    });
    
    socket.on('render_nodes', function(json){
        for (var key in json){
            if (json.hasOwnProperty(key)){
                var node = json[key];
                node['time'] = new Date(1000*node['timestamp']);
                if (node['node_type'] == 'comment'){
                    insert_comment(node['node'], node['parent_type'], node['parent_id'])
                }
                if (node['node_type'] == 'prompt'){
                    insert_prompt(node['node'], node['parent_type'], node['parent_id'])
                }
                if (node['node_type'] == 'response'){
                    insert_response(node['node'], node['parent_type'], node['parent_id'])
                }
            }
        }
    });
    socket.on('update_scores', function(json){
        for (var key in json) {
            if (json.hasOwnProperty(key)) {
                var node = json[key];
                $(`div#${node.node_type}_${node.node_id} > .data #score`).text(Math.round(100*node.score)/100);
            }
        }
    });
    socket.on('update_clicks', function(json){
        for (var key in json) {
            if (json.hasOwnProperty(key)) {
                var node = json[key];
                if (node.node_type == 'response'){
                    $(`div#response_${node.node_id} > .data #clicks`).text(node.clicks);
                }
            }
        }
    });
    
    socket.on('connect', function(){
        socket.emit('test' )
    });
    socket.on('message', function(json){
        for (var msg in json['messages']){
            console.log(msg)
        }
    });

    render_thread(14,2); // Eventually render linked position by sending argument from flask
    print('javascript rendered');
}

// Homepage
function render_home(){
    // delete all content
    var content = document.getElementById("content");
    while (content.firstChild) {
        content.removeChild(content.firstChild)}


    // insert home template
    $(
        `<div class="community_views">` +
        `  <h2> Communities </h2>` +
        `</div>` +
        `<div id="new_community">` +
        `  <button>[New Community]` +
        `</div>`
    ).appendTo(content);

    // get homepage info from server
    open_socket().emit('render_home')
}
function insert_communityview(community){
    $(
        `<div class="community_view" id="community_view_${community.id}">` +
            `  <t class="community_title" onclick="render_community(${community.id})">${community.body}</t>` +
            `</div>`
    ).appendTo($(`div.community_views`))
}

// Community page
function render_community(community_id){
    // delete all content
    var content = document.getElementById("content");
    while (content.firstChild) {
        content.removeChild(content.firstChild)}

    $(
        `<div class="community_data">` +
        `  <h2 class="community_data">` +
        `</h2>` +
        `<div class="thread_views">` +
        `  <button onclick=render_home()><</button><h2 class="thread_title"></h2>` +
        `  <h2> Threads </h2>` +
        `</div>` +
        `<div id="new_thread">` +
        `  <button>[New Thread]</button>` +
        `</div>`
    ).appendTo(content);

    // get community info from server
    open_socket().emit('render_community', {'community_id': community_id})
}
function insert_threadview(thread, community_id){
    $(
        `<div class="thread_view" id="thread_view_${thread.id}">` +
            `  <t class="thread_title" onclick="render_thread(${thread.id}, ${community_id})">${thread.body}</t>` +
            `</div>`
    ).appendTo($(`div.thread_views`))
}

// A thread
function render_thread(thread_id, community_id){
    // delete all content
    var content = document.getElementById("content");
    while (content.firstChild) {
        content.removeChild(content.firstChild)}
    // insert thread template
    $(
        `<div id="thread_${thread_id}" class="thread">` +
        `  <div class="data thread_data">` +
        // `    <button onclick=render_community(${community_id})><</button>` +

        `    <h3 class="thread_title"></h3>` +
        `  </div>` +
        `  <div id="children">` +
        `  </div>` +
        `</div>` +
        `<div class="thread_footer">` +
        // `  <button id="new_post" onclick="new_post('thread',${thread_id})">New Post</button>` +
            '  <textarea id="textarea" rows="2" cols="100" placeholder="Reply" ></textarea>' +
            `  <button id="submit_post" onclick="new_post('thread',${thread_id})">Post</button>` +
            '  <div id="selections">' +
            `    <input type="radio" name="post_type" value="comment" checked><label>Comment</label></input><br>` +
            `    <input type="radio" name="post_type" value="prompt"><label>Prompt</label></input>  ` +
        `  </div>` +
        `</div>`
    ).appendTo(content);

    // fill community template
    open_socket().emit('join',{'room': `thread_${thread_id}`});
    open_socket().emit('render_thread', {'thread_id': thread_id})
}

function insert_comment(comment, parent_type, parent_id){
    var parent_children = $(`div#${parent_type}_${parent_id} > #children`);
    if (parent_children.length) {
        $(
            `<div class="comment" id="comment_${comment.id}">` +
            `  <div class="data comment_data">` +
            `    <button onclick="upvote('comment',${comment.id})">+</button>` +
            `    <t id="score" class="comment_score">${comment.score}</t>` +
            `    <t id="author" >${comment.author}:</t>` +
            `    <t class="comment_title">${comment.body}</t>` +
            // `    <t class="comment_time">${comment.time}</t>` +
            `  </div>` +
            `  <div class="comment_footer">` +
            `    <button id="reply" onclick="new_post('comment',${comment.id})" style="display: none;">Reply</button>` +
            `    <button id="expand" onclick="expand_posts('comment',${comment.id})" style="display: none;">Expand</button>` +
            `    <button id="collapse" onclick="collapse_posts('comment',${comment.id})" style="display: none;">Collapse</button>` +
            `  </div>` +
            `</div>`
        ).appendTo(parent_children);

        if (comment.has_children == true) {
            $(`div#comment_${comment.id} > .comment_footer #expand`).show()
        }else{
            $(`div#comment_${comment.id} > .comment_footer #reply`).show()
        }
    }else{
        if(parent_type != 'thread' ) {
            $(`div#${parent_type}_${parent_id} > .${parent_type}_footer #expand`).show()
        }
    }
}
function insert_prompt(prompt, parent_type, parent_id){
    var parent_children = $(`div#${parent_type}_${parent_id} > #children`);
    if (parent_children.length) {
        $(
            `<div class="prompt" id="prompt_${prompt.id}">` +
            `  <div class="data prompt-data">` +
            `    <button onclick="upvote('prompt',${prompt.id})">+</button>` +
            `    <t id="score" class="prompt_score">${prompt.score}</t>` +
            `    <t id="author">${prompt.author}:</t>` +
            `    <h class="body">${prompt.body}</h>` +
            `  </div>` +
            `  <div id="responses" style="background-color: #808080;">` +
            `    <button id="add_response" onclick="new_response('prompt',${prompt.id})">Respond</button>` +
            `  </div>` +
            `  <div class="prompt_footer">` +
            `    <button id="reply" onclick="new_post('prompt',${prompt.id})"  style="display: none;"">Reply</button>` +
            `    <button id="expand" onclick="expand_posts('prompt',${prompt.id})" style="display: none;">Expand</button>` +
            `    <button id="collapse" onclick="collapse_posts('prompt',${prompt.id})" style="display: none;">Collapse</button>` +
            `  </div>` +
            `</div>`
        ).appendTo(parent_children);

        if(prompt.has_children == true){
            $(`div#prompt_${prompt.id} > .prompt_footer #expand`).show()
        }else{
            $(`div#prompt_${prompt.id} > .prompt_footer #reply`).show()
        }
    }else{
        if(parent_type != 'thread'){
        $(`div#${parent_type}_${parent_id} > .${parent_type}_footer #expand`).show()
    }
    }
    if(prompt.has_responses == true){
        open_socket().emit('get_responses',{
            'parent_type': 'prompt',
            'parent_id': prompt.id
        })
    }

}
function insert_response(response, parent_type, parent_id){
    var parent_responses = `div#${parent_type}_${parent_id} > #responses `;
    if ($(parent_responses).length) {
        $(
            `<div class="response ${response.relationship}_data" id="response_${response.id}">` +
            `  <div class="data" >` +
            `    <t class="response_score" id="score">${Math.round(100*response.score)/100}</t>` +
            `    <t id="author">${response.author}:</t>` +
            `    <t class="response_body">${response.body}</t><br>` +
            `    <button id="downvote" onclick="upvote('response',${response.id},-1)">-</button>` +
            `    <t class="response_clicks" id="clicks">0</t>` +
            `    <button id="upvote" onclick="upvote('response',${response.id},1)">+</button>` +
            `    <a id="expand" onclick="expand_responses(${response.id})"">see more</a>` +
            `    <a id="collapse" onclick="collapse_responses(${response.id})" style="display: none;">see less</a>` +
            `  </div>` +
            // `  <div class="response_footer">` +
            // `    <button id="respond" onclick="new_response('response',${response.id})">Respond</button>` +
            // `  </div>` +
            `</div>`
        ).insertBefore(`${parent_responses} > #add_response`);
        if (response.has_responses == true) {
            $(`div#response_${response.id} > .response_footer #expand`).show();
            $(`div#response_${response.id} > .response_footer #respond`).hide();
            if(parent_type=='prompt'){
                expand_responses(response.id)
            }
        }
    }else{
        if(parent_type == 'response'){
            $(`div#response_${parent_id} > .response_footer #expand`).show()
        }
    }

}

function new_post(parent_type, parent_id){
    if (parent_type =='thread'){

        var text = $('#textarea');
        if (text.val().length < 10) {
            text.val('');
            text.attr("placeholder", "Must contain at least 10 characters");
        } else {
            submit_post('thread', parent_id, text.val(), $(`#selections input[name=post_type]:checked`).val());
            text.val('');
            text.attr("placeholder", "Reply");
            $('#selections input[name=post_type]').filter('[value="comment"]').attr('checked', true)
        }
    }else {
        var parent = `div#${parent_type}_${parent_id} > .${parent_type}_footer`;
        var form = `${parent} > div#post_form`;
        $(
            '<div id="post_form">' +
            '  <input class="post_text" type="text"/>' +
            '  <button id="submit_post">Confirm</button>' +
            '  <button id="cancel_post">Cancel</button><br id="break">' +
            `  <input type="radio" name="post_type" value="comment" checked>Comment</input>` +
            `  <input type="radio" name="post_type" value="prompt">Prompt</input>  ` +
            '</div>'
        ).appendTo(parent);


        $(`${parent} > button#new_post`).hide();
        $(`${form} > button#cancel_post`).click(function () {
            $(`${parent} > button#new_post`).show();
            $(form).remove();
            $(`${form} > #alert`).remove()
        });

        $(`${form} > button#submit_post`).click(function () {
            var textbox = $(`${form} > input.post_text`);
            $(`${form} > #alert`).remove();
            if (textbox.val().length < 10) {
                $('<t id="alert">Your response must be at least 10 characters</t><br id="alert">'
                ).insertAfter(`${form} > #break`)
            } else {
                submit_post(parent_type, parent_id, textbox.val(), $(`${form} input[name=post_type]:checked`).val());
                $(form).remove();

                // $(`${parent} > button#new_post`).show();
                if ($(`div#${parent_type}_${parent_id} > #children`).length == 0){
                    $('<div id="children"></div>'
                        ).insertBefore(`div#${parent_type}_${parent_id} > .${parent_type}_footer`);
                        $(`div#${parent_type}_${parent_id} > .${parent_type}_footer > #collapse`).show();
                        $(`div#${parent_type}_${parent_id} > .${parent_type}_footer > #reply`).show();
                }
            }
        })
    }

}

function submit_post(parent_type, parent_id, text, node_type){
    open_socket().emit('new_node', {
        'parent_type': parent_type,
        'parent_id': parent_id,
        'node_type': node_type,
        'body': text
    });

}
function new_response(parent_type, parent_id) {
    var parent = `div#${parent_type}_${parent_id} > #responses`;
    var form = `${parent} > div#response_form`;
    $(
        '<div id="response_form">' +
        '  <input class="response_text" type="text"/>' +
        '  <button id="submit_response">Confirm</button>' +
        '  <button id="cancel_response">Cancel</button><br id="break">' +
        `  <input id="supp" type="radio" name="response_type" value="support" checked><label>Support</label></input>` +
        `  <input id="chal" type="radio" name="response_type" value="challenge"><label>Challenge</label></input>` +
        '</div>'
    ).insertBefore(`${parent} > #add_response`);

    $(`${parent} > button#add_response`).hide();

    if (parent_type == 'prompt'){
        $(`${form} > #supp`).remove();
        $(`${form} > #chal`).remove();
        $(`${form} > label`).remove();
    }

    $(`${form} > button#cancel_response`).click(function(){
        $(`${parent} > button#add_response`).show();
        $(form).remove();
        $(`${form} > #alert`).remove()

    });

    $(`${form} > button#submit_response`).click(function(){
        var textbox = $(`${form} > input.response_text`);
        $(`${form} > t#alert`).remove();
        if ( textbox.val().length < 3) {
            $(form).append(
                    '<t id="alert">Your response must be at least 3 characters</t><br id="alert">')
        } else {
                if (parent_type == 'prompt'){
                    var response_type = 'respond'
                }else{
                    var response_type = $(`${form} input[name=response_type]:checked`).val()
                }

            open_socket().emit('new_node', {
                'parent_type': parent_type,
                'parent_id': parent_id,
                'node_type': 'response',
                'response_type': response_type,
                'body': textbox.val()
            });

            $(`${parent} > button#add_response`).show();
            $(form).remove();
        }
    });
}

function expand_posts(parent_type, parent_id) {
    $(`div#${parent_type}_${parent_id} > .${parent_type}_footer > #expand`).toggle();
    $(`div#${parent_type}_${parent_id} > .${parent_type}_footer > #collapse`).toggle();
    $(`div#${parent_type}_${parent_id} > .${parent_type}_footer > #reply`).toggle();

    open_socket().emit('get_posts',{
        'parent_type': parent_type,
        'parent_id': parent_id
    });

    $('<div id="children"></div>'
    ).insertBefore(`div#${parent_type}_${parent_id} > .${parent_type}_footer`);
}
function collapse_posts(parent_type, parent_id) {
    $(`div#${parent_type}_${parent_id} > #children`).remove();
    $(`div#${parent_type}_${parent_id} > .${parent_type}_footer #expand`).toggle();
    $(`div#${parent_type}_${parent_id} > .${parent_type}_footer #collapse`).toggle();
    $(`div#${parent_type}_${parent_id} > .${parent_type}_footer #reply`).toggle();
}
function expand_responses(response_id) {
    $(
        `  <div id="responses">` +
        `    <button id="add_response" onclick="new_response('response',${response_id})">Respond</button>` +
        `  </div>`

    ).insertAfter(`div#response_${response_id} > .data`);

    $(`div#response_${response_id} > .data > #expand`).toggle();
    $(`div#response_${response_id} > .data > #collapse`).toggle();
    $(`div#response_${response_id} > .response_footer > #reply`).toggle();

    open_socket().emit('get_responses',{
        'parent_type': 'response',
        'parent_id': response_id
    });
}
function collapse_responses(response_id) {
    $(`div#response_${response_id} > #responses`).remove();
    $(`div#response_${response_id} > .data #expand`).show();
    $(`div#response_${response_id} > .data #collapse`).hide();
}

function upvote(node_type, node_id, val){
    open_socket().emit('upvote',{
        'node_type': node_type,
        'node_id': node_id,
        'val': val
    });
}