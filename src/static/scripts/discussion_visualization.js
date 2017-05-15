/**
 * Created by samuel on 4/12/17.
 */

// declarations
var max_width = 300,
    answer_height = 110,
    answer_spacing = 30;

function open_socket() {
    var namespace = '/_thread';
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
    return socket
}

function question_uid() { return parseInt(window.location.href.split('/')[4]) }

function document_ready(){
    var socket = open_socket();

    socket.on('render_question', function(data) {
        render_question(data[0]);
        update_clicks(data[1]);
    });
    socket.on('connect', function() {

    });
    socket.on('new_post', function(json){ new_post(json) });
    socket.on('update_scores', function(scores){
        update_scores(scores)
    })
    socket.on('update_clicks', function(clicks){
        update_clicks(clicks)
    })
    socket.on('rooms', function(rooms){
    })
    socket.on('move_node', function(data) { update_node_position(data) })

    socket.emit('render_question', {'question_uid': question_uid(), 'type': 'question'});
    chat_bar();
}

var drag_this = d3.drag().subject(this)
        .on('start',function (d) {
            if (d.x1){
                d.x1 =  d3.event.x - d.xt;
                d.y1 =  d3.event.y - d.yt;
            }else{
                d.x1 = d3.event.x;
                d.y1 = d3.event.y;
            }
        })
        .on('drag',function (d) {
            d3.select(this)
            .attr("transform", "translate(" + (d3.event.x - d.x1) + "," + (d3.event.y - d.y1) + ")");

            d.xt = d3.event.x - d.x1;
            d.yt = d3.event.y - d.y1;
        });

var drag_LR = d3.drag().subject(this)
        .on('start',function (d) {
            if (d.x1){
                d.x1 =  d3.event.x - d.xt;
            }else{
                d.x1 = d3.event.x;
            }
        })
        .on('drag',function(d){
            d3.select(this)
            .attr("transform", "translate(" + (d3.event.x - d.x1) + ",0)");
            d.xt = d3.event.x - d.x1;
        });

// d3.selection.prototype.moveToBack = function() {
//         return this.each(function() {
//             var firstChild = this.parentNode.firstChild;
//             if (firstChild) {
//                 this.parentNode.insertBefore(this, firstChild);
//             }
//         });
//     };


function render_question(features){
    var nodes = features.nodes,
        edges = features.edges.filter(function(edge){ return edge.type!='ANSWER' }),
        head = features.head,
        relevant = features.relevant,
        svg = d3.select("svg"),
        width = parseInt(svg.style('width').match(/\d+/)[0]) ,
        height = parseInt(svg.style('height').match(/\d+/)[0]);

    // colors
    var question_color = '#455B49',
        post_color = '#F1F5F5',
        answer_color = '#ADC698'

    for (e in edges){
        edges[e]['xp'] = 0
        edges[e]['yp'] = 0
    }
    for (n in nodes){nodes[n].xt = 0; nodes[n].yt = 0}


    //// make panels
    var main = svg.selectAll('.main')
        .data([{'data':0}]).enter().append('g')
        .classed('main', true)
        // .call(drag_this)
        ;

    var post_panel = main.selectAll('.post_panel')
        .data([{'data':0}]).enter().append('g')
        .classed('post_panel', true)
        // .call(drag_LR)
        ;

    post_panel
        .append('rect')
        .attr('y', -1000)
        .attr('x', -500)
        .attr('width',3000)
        .attr('height', 3000)
        .style('fill', post_color);

    var answer_panel = main.selectAll('.answer_panel')
        .data([{'data':0}]).enter().append('g')
        .classed('answer_panel', true);

    answer_panel
        .append('rect')
        .attr('x', 1)
        .attr('y', -2000)
        .attr('width', 268)
        .attr('height', 6000)
        .style('fill', answer_color)
        .style('stroke', question_color)
        .style('stroke-width', 3);

    var answer_footer =  main.selectAll('.answer_footer')
        .data([{'data':0}]).enter().append('g')
        .classed('answer_footer', true)
        .append('rect')
        .attr('width', width)
        .attr('height', 60)
        .attr('x', 1)
        .attr('y', height - 60 )
        .style('fill', question_color);;

    var question_panel = main.selectAll('.question_panel')
        .data([{'data':0}]).enter().append('g')
        .classed('question_panel', true);

    question_panel
        .append('rect')
        .attr('width',width)
        .attr('height', 100)
        // .attr('stroke', '#808D8D')
        // .attr('stroke-width', 1)
        .style('fill', question_color);


    //// Question
    if (head['type'] == 'question'){
        head['node']['x'] = width/2;
        head['node']['y'] = 15;
        var question_node = make_nodes(question_panel, [head['node']], true, 'question_node', true)
        question_panel.select('rect').attr('height', 30 + parseInt(question_node.data()[0]['height']))
    }


    //// separate nodes by type
    var answers = [];
    var comments = [];
    var posts = [];
    for (n in nodes){
        if (nodes[n]['answering']){answers.push(nodes[n])}
        else if (nodes[n]['commenting']){comments.push(nodes[n])}
        else {posts.push(nodes[n])}
    }


    //// Answers
    answers = answers.sort(function(a,b){
        if (a['score'] > b['score']){return -1}
        else {return 1}
    });

    var answer_ids = [];
    for (var a=0; a < answers.length; a++){
        answers[a]['x'] = 8;
        answers[a]['y'] = a*100 + parseInt(question_panel.select('rect').attr('height')) + answer_spacing;
        answer_ids.push(answers[a].id)
    }

    var answer_nodes = make_nodes(answer_panel, answers, true, 'answer_node', false)

    // move answer closer to one another
    var at = 0
    for (var a=0; a < answers.length; a++){
        var node = d3.select(`#node_${answers[a].id}`),
            box = d3.select(`#node_${answers[a].id} rect`)
        if (a>0){
            var top = d3.select(`#node_${answers[a-1].id} rect`)
            node.attr('transform', function(d){
                iat = at
                d.yt = parseInt(top.attr('y')) + parseInt(top.attr('height')) - parseInt(box.attr('y')) + answer_spacing
                at += d.yt
                d.yt += iat
                d.y += d.yt
                d.height = parseInt(box.attr('height'))
            return `translate(0,${d.yt})`})
        }
        node.data()[0].yt = 0
        node.data()[0].height = parseInt(box.attr('height'))
    }


    //// Posts (inherit coords from parents)
    function inherit_position(parent_ids, done, nodes, edges){
        var up_next = [];
        for (var p=0; p<parent_ids.length; p++){
            // find edges connected to children
            var child_edges = [];
            for (var e=0; e<edges.length; e++){if (edges[e]['target'] == parent_ids[p]){child_edges.push(edges[e])}}
            // for each child
            var child_nodes = [];
            for (var c=0; c<child_edges.length; c++){
                var child_id = child_edges[c]['source'];
                // if it's the first time dealing with this child
                if ($.inArray(child_id, done)==-1){
                    var child_node = nodes.filter(function (obj) {return obj.id == child_id});

                    // get coordinates of parent nodes
                    var parent_x = [];
                    var parent_y = [];
                    var skip=false;
                    for (var e=0; e<edges.length; e++){
                        if (edges[e]['source']==child_id) {
                            var parent = nodes.filter(function (obj) {return obj.id == edges[e].target});
                            if (!parent[0]['x']){ skip = true }
                            parent_x.push(parent[0]['x']);
                            parent_y.push(parent[0]['y']);
                        }
                    }
                    if (!skip){
                        if (!child_node[0].hasOwnProperty('x')){
                            child_node[0]['x'] = parent_x.reduce(function(a,b){return a+b})/parent_x.length + 325 + Math.random();
                            child_node[0]['y'] = parent_y.reduce(function(a,b){return a+b})/parent_x.length + Math.random();
                        }
                        done.push(child_id)
                        up_next.push(child_id)
                    }
                }
            }
        }
        if (up_next.length > 0){
            done = inherit_position(up_next, done, nodes, edges);
        }
        return done
    }
    inherit_position(answer_ids, [], nodes, edges);

    var post_nodes = make_nodes(post_panel, posts, false, 'post_node', false)


    //// cComments
    var comment_nodes = make_nodes(post_panel, comments, false, 'comment_node', false)


    //// Links
    var links = make_links(edges, true)


    //// Reply box
    var reply_box = main.append('foreignObject');

    reply_box.append('xhtml:div')
        .classed('reply_box', true)
        .attr('id', "reply_box")
        .html('<textarea id="text_reply" cols="60" style="float: left; font-size: 16px"></textarea>' +
              '<button style="margin-top: 25px; margin-left: 4px;" onclick="submit_post()">Reply</button>')

    var bcr = document.getElementById("reply_box").getBoundingClientRect()

    reply_box.attr('width', bcr.width)
        .attr('height', bcr.height)
        .attr('x', 270)
        .attr('y', height - 51);


    //// New answer button
    if (features.answerable){
        add_answer_button(height)
    }


    //// Final touches
    // var all_postpanel_nodes = post_panel.selectAll('g');
    post_panel.call(drag_with_links(d3.select('.post_panel').selectAll('.a_node'), links, false, false));
    answer_panel.call(drag_with_links(answer_nodes, links, false, true));
    post_nodes.call(drag_this_with_links(links,false))
    comment_nodes.call(drag_this_with_links(links,false))
    // equilibrate_nodes(post_nodes, links, 500)
    send_to_back(post_panel.node())
}

function send_to_back(item){
    var firstChild = item.parentNode.firstChild;
    if (firstChild) {
        item.parentNode.insertBefore(item, firstChild);
    }
}
function resize_borders(groups) {
    // SELECT ALL CHILD NODES EXCEPT THE BOUNDING RECT
    var borders = groups.selectAll('.border_rect');
    var childs = groups.selectAll(':not(.border_rect)');


    borders.attr('width', function () {
        var parent = d3.select(this.parentNode);
        // var siblings = parent.not(this)
        // var childs = parent.selectAll(':not(.border_rect)');
        // console.log(parent.filter(function(d){return d.classed()}));
        // console.log(d3.max(parent, function(d){return d.getBBox().width}));
        return 50
    });
    var width = childs.node().getBBox().width;


    //
}

function upvote(post_id){
    open_socket().emit('upvote', post_id)
}
function update_scores(scores){
    for (var s in scores){
        $(`div#${scores[s].id} .post_score`).text(scores[s].score)
    }
}
function update_clicks(clicks){
    for (var c in clicks){
        var button_val = '+'
        if ( clicks[c] ){ button_val = '-' }
        $(`#div_${c} button.upvote`).text(button_val)
    }
}
function update_node_position(data){
    var node = d3.select(`#node_${data.id}`)
    node.attr('transform', function(d){
        return `translate(${data.x - d.x},${data.y - d.y})`
    })
    
    d3.selectAll('.link').each(function(d){
        reformat_link(this)
    })
}

function post_html(post){
    var post_time = new Date(0);
    post_time.setUTCSeconds(post['time']);
    var current_time = new Date();

    var time = "%H%:%M% %m%/%d%/%y%";
    var elems = {'%H%': post_time.getHours(), '%M%': post_time.getMinutes(),// '%s%': post_time.getSeconds(),
                 '%m%': post_time.getMonth(), '%d%': post_time.getDate(), '%y%': post_time.getYear()};

    time = time.replace(/%\w+%/g, function(all) {
        return elems[all] || all;
    });
    if (post['type'] == 'Question'){
        return `<div class="question_post post" id="${post['id']}">` +
                `   <div class="body_div">` +
                `      <div class="author">${post['author']}:</div>` +
                `      <div class="post_text">${post['body']}</div>` +
                `   </div>` +
                `</div>`
    }else if(post['commenting']){
        return `<div class="comment_post post" id="${post['id']}">` +
                `   <div class="body_div">` +
                `      <div class="author">${post['author']}:</div>` +
                `      <div class="post_text">${post['body']}</div>` +
                `   </div>` +
                `   <div class="post_footer">`+
                `      <div class="right_footer">` +
                `         <a id="com" onclick="reply(${post['id']}, 3)">Comment</a>` +
                `      </div>` +
                `   </div>` +
                `</div>`
    }else{
        return `<div class="post" id="${post['id']}">` +
                `   <div class="body_div">` +
                `      <div class="author">${post['author']}:</div>` +
                `      <div class="post_text">${post['body']}</div>` +
                `   </div>` +
                `   <div class="post_footer">`+
                `      <div class="left_footer">` +
                `         <button class="upvote" onclick="upvote(${post['id']})">+</button>` +
                `         <t id="score" class="post_score">${post['score']}</t>` +
                `      </div>` +
                `      <div class="right_footer">` +
                `         <a id="sup" onclick="reply(${post['id']}, 1)">Support</a> |` +
                `         <a id="chal" onclick="reply(${post['id']}, 2)">Challenge</a> |` +
                `         <a id="com" onclick="reply(${post['id']}, 3)">Comment</a>` +
                `      </div>` +
                `   </div>` +
                `</div>`
    }
}

function submit_post(answer){
    if (answer){
        var textbox = $(`.answer_box  textarea`);
        open_socket().emit('new_post', {
            'body': textbox.val(),
            'answering': true,
            'question_uid': question_uid()
        });
        add_answer_button()
    }else{
        var textbox = $(`div#reply_box > textarea`);
        open_socket().emit('new_post', {
            'body': textbox.val(),
            'answering': false,
            'question_uid': question_uid()
        });
        textbox.val('');
    }
}
function reply(post_id, mode){
    var textbox = $(`div#reply_box > textarea`);

    if (mode==0){
        textbox.val(textbox.val() + `~@${post_id} `)
    }
    if (mode==1){
        textbox.val(textbox.val() + `^@${post_id} `)
    }
    if (mode==2){
        textbox.val(textbox.val() + `!@${post_id} `)
    }
    if (mode==3){
        textbox.val(textbox.val() + `@${post_id} `)
    }
    textbox.focus();
}
function new_post(json){
    // NOTE: This function is suboptimal
    var post = json['node'],
        edges = json['edges'],
        done = false;

    if (post['answering']){
        // find right-most answer
        var answers = d3.selectAll('.answer_node'),
            num = 0,
            x = 8,
            y = parseInt(d3.select('.question_panel').select('rect').attr('height'));

        answers.each(function(d){
            y = Math.max(y,d.y + d.height + d.yt)
            num += 1
        })

        post['x'] = x;
        post['y'] = y + answer_spacing;

        var node = make_nodes(d3.select('.answer_panel'), [post], true, 'answer_node', false);
        edges = [];

        add_answer_button()
    }else if (post['commenting']){
        var targets = d3.selectAll('.a_node'),
            target_ids = []
            ys = [],
            xsum = 0;

        for (e in edges) {
            target_ids.push(edges[e]['target'])
        }

        targets.each(function (d) {
            if ($.inArray(d.id, target_ids) != -1) {
                ys.push(parseInt(d.y));
                xsum += d.x;
            }
        })

        post['x'] = xsum / ys.length + 250;
        post['y'] = Math.max.apply(Math, ys) + 150;
        post['yt'] = 0;
        post['xt'] = 0;

        var node = make_nodes(d3.select('.post_panel'), [post], false, 'comment_node', false);
        var links = make_links(edges, true)
        node.call(drag_this_with_links(d3.selectAll('.link'), false))
    }else{
        var targets = d3.selectAll('.a_node'),
            target_ids = []
            ys = [],
            xsum = 0;

        for (e in edges) {
            target_ids.push(edges[e]['target'])
        }

        targets.each(function (d) {
            if ($.inArray(d.id, target_ids) != -1) {
                ys.push(parseInt(d.y));
                xsum += d.x;
            }
        })

        post['x'] = xsum / ys.length;
        post['y'] = Math.max.apply(Math, ys) + 150;
        post['yt'] = 0;
        post['xt'] = 0;

        var node = make_nodes(d3.select('.post_panel'), [post], false, 'post_node', false);
        var links = make_links(edges)
        node.call(drag_this_with_links(d3.selectAll('.link'), false))
    }

    d3.select('.post_panel').call(drag_with_links(d3.select('.post_panel').selectAll('g'), d3.selectAll('.link'), false));
}

function drag_with_links(groups, links, LR, UD) {
    return d3.drag().subject(this)
        .on('start', function (d) {
            if (d.xt){
                d.x1 = d3.event.x - d.xt;
                d.y1 = d3.event.y - d.yt;
            }else{
                d.x1 = d3.event.x;
                d.y1 = d3.event.y;
            }
        })
        .on('drag', function (d) {
            d.xt = d3.event.x - d.x1;
            d.yt = d3.event.y - d.y1;

            if (LR) {
                d3.select(this)
                    .attr("transform", "translate(" + (d3.event.x - d.x1) + ",0)");
            }else if (UD){
                d3.select(this)
                    .attr("transform", "translate(0," + (d3.event.y - d.y1) + ")");
            }else{
                d3.select(this)
                    .attr("transform", "translate(" + (d3.event.x - d.x1) + "," + (d3.event.y - d.y1) + ")");
            }

            var xp = d.xt,
                yp = d.yt


            groups.each(function(d) {
                d3.selectAll('[source="' + d.id + '"]')
                    .each(function (d) {
                        if(!UD){
                            d.x1 = d.x1 + d3.event.dx;
                        }
                        if(!LR) {
                            d.y1 = d.y1 + d3.event.dy;
                        }
                    });

                d3.selectAll('[target="' + d.id + '"]')
                    .each(function (d) {
                        if(!UD){
                            d.x2 = d.x2 + d3.event.dx;
                            d.xp = xp
                        }
                        if(!LR){
                             d.y2 = d.y2 + d3.event.dy;
                             d.yp = yp
                        }
                    });
            });

            links.each(function(d){
                reformat_link(this);
            });
        })
        // .on('end', function () {
        //     equilibrate_nodes(groups, links, 500)
        // })
        ;
}
function drag_this_with_links(links, LR) {
    return d3.drag().subject(this)
        .on('start', function (d) {
            if (d.xt){
                d.x1 = d3.event.x - d.xt;
                d.y1 = d3.event.y - d.yt;
            }else{
                d.x1 = d3.event.x;
                d.y1 = d3.event.y;
            }
        })
        .on('drag', function (d) {
            d.xt = d3.event.x - d.x1;
            d.yt = d3.event.y - d.y1;

            if (LR) {
                d3.select(this)
                    .attr("transform", "translate(" + (d3.event.x - d.x1) + ",0)");
            }else{
                d3.select(this)
                    .attr("transform", "translate(" + (d3.event.x - d.x1) + "," + (d3.event.y - d.y1) + ")");
            }

            d3.selectAll('[source="' + d.id + '"]')
                .each(function (d) {
                    d.x1 = d.x1 + d3.event.dx;
                    if(!LR) {
                        d.y1 = d.y1 + d3.event.dy;
                    }
                });

            d3.selectAll('[target="' + d.id + '"]')
                .each(function (d) {
                    d.x2 = d.x2 + d3.event.dx;
                    d.y2 = d.y2 + d3.event.dy;
                });


            links.each(function(d){
                reformat_link(this);
            });
        })
        .on('end', function(d) {
            open_socket().emit('move_node', {'id': d.id, 'x': d.x + d.xt, 'y': d.y + d.yt, 'quid': question_uid()})
        })
        // .on('end', function () {
        //     equilibrate_nodes(groups, links, 500)
        // })
        ;
}

function equilibrate_nodes(groups, links, time){
    var t = d3.timer(function(elapsed) {
        groups.each(function(d){
            if (!d.xt){
                d.xt=0
                d.yt=0
            }
            d.force = [0,0]
        });

        // find edge-to-edge forces
        groups.each(function(d){
            var p_height = d3.select(this).data()[0].height,
                p_width = d3.select(this).data()[0].width,
                px = d3.select(this).data()[0].x + d.xt,
                py = d3.select(this).data()[0].y + d.yt,
                p_id = d.id;


            groups.each(function(d){
                if (d.id != p_id && !d3.select(this).classed('fixed')){
                    var c_height = d3.select(this).data()[0].height,
                        c_width = d3.select(this).data()[0].width,
                        cx = d3.select(this).data()[0].x + d.xt,
                        cy = d3.select(this).data()[0].y + d.yt,
                        dx = px - cx,
                        dy = py - cy,
                        dist = Math.sqrt(dx**2 + dy**2);
                    if (dx>0){var ang = Math.atan(dy/dx)}else{var ang = Math.atan(dy/dx) - 3.14}

                    // check if overlapping
                    if (((cx >= px && cx <= px + p_width) || (px >= cx && px <= cx + c_width)) &&
                        ((cy >= py && cy <= py + p_height) || (py >= cy && py <= cy + c_height))){
                        d.force[0] -= 10 * Math.cos(ang);
                        d.force[1] -= 10 * Math.sin(ang);
                    }else{
                        // calculate distance between two surfaces
                        var cxm = cx + c_width/2,
                            cym = cy + c_height/3,
                            pxm = px + p_width/2,
                            pym = py + p_height/3;

                        if (cxm-pxm>0){var ang = Math.atan((cym-pym)/(cxm-pxm))}else{var ang = Math.atan((cym-pym)/(cxm-pxm)) - 3.14}

                        //correct hypotenuse for child
                        var cx1 = c_width/2 * (cxm-pxm)/Math.abs(cxm-pxm + 0.001),
                            cy1 = cx1 * Math.tan(ang),
                            ch1 = Math.sqrt(cx1**2 + cy1**2),
                            cy2 = c_height/2 * (pym-cym)/Math.abs(pym-cym + 0.001),
                            cx2 = cy2 / Math.tan(ang),
                            ch2 = Math.sqrt(cx2**2 + cy2**2),
                            ch = Math.min(ch1, ch2);

                        //correct hypotenuse for parent
                        var px1 = p_width/2 * (cxm-pxm)/Math.abs(cxm-pxm + 0.001),
                            py1 = px1 * Math.tan(ang),
                            ph1 = Math.sqrt(px1**2 + py1**2),
                            py2 = p_height/2 * (pym-cym)/Math.abs(pym-cym + 0.001),
                            px2 = py2 / Math.tan(ang),
                            ph2 = Math.sqrt(px2**2 + py2**2),
                            ph = Math.min(ph1, ph2);

                        var dist = Math.sqrt((cxm-pxm)**2 + (cym-pym)**2)

                        // if (ch1 < ch2) {
                        //     if (cx > px){
                        //         d.force[0] += 1/(cx - px - p_width)^2
                        //     }else{
                        //         d.force[0] -= 1/(px - cx - c_width)^2
                        //     }
                        // } else {
                        //     if (cy > py) {
                        //         d.force[1] += 1/(cy - py - p_height)^2
                        //     } else {
                        //         d.force[1] -= 1/(py - cy - c_height)^2
                        //     }
                        // }

                        // d.force[0] += Math.max(-5, Math.min(5, (1 / ( (dist-ch-ph) * Math.cos(ang) + 0.001 )**2)))
                        // d.force[0] += Math.max(-5, Math.max(5, (1 / ( (dist-ch-ph) * Math.sin(ang) + 0.001 )**2)))

                    }
                }
            });
        });

        links.each(function(d){
            // get length of edges, further --> more attractive force
            var source = d3.select('[id=node_' + d3.select(this).attr('source') + ']'),
                target = d3.select('[id=node_' + d3.select(this).attr('target') + ']'),
                line = d3.select(this).data()[0],
                dx = line.x1 - line.x2,
                dy = line.y1 - line.y2,
                len = Math.sqrt(dx**2 + dy**2);
            if (dx>0){var ang = Math.atan(dy/dx)}else{var ang = Math.atan(dy/dx) - 3.14}

            // bond forces
            if(!source.classed('fixed')){
                source.data()[0].force[0] -= Math.max(-1,Math.min(1, (len - 200) * Math.cos(ang)));
                source.data()[0].force[1] -= Math.max(-1,Math.min(1, (len - 200) * Math.sin(ang)));
            }if(!target.classed('fixed')){
                target.data()[0].force[0] += Math.max(-1,Math.min(1, (len - 200) * Math.cos(ang)));
                target.data()[0].force[1] += Math.max(-1,Math.min(1, (len - 200) * Math.sin(ang)));
            }
        });

        // apply forces
        groups
            .attr("transform", function(d){
                if (!d3.select(this).classed('fixed')){
                    d.xt += d.force[0];
                    d.yt += d.force[1];
                    return "translate(" +  d.xt + "," + d.yt + ")"
                }
            }).each(function(d){
                var dx = d.force[0],
                    dy = d.force[1];

                d3.selectAll('[source="' + d.id + '"]')
                    .each(function(d) {
                        d.x1 = d.x1 + dx;
                        d.y1 = d.y1 + dy;
                    });

                d3.selectAll('[target="' + d.id + '"]')
                    .each(function(d) {
                        d.x2 = d.x2 + dx;
                        d.y2 = d.y2 + dy;
                    });
        });

        links.each(function(d){
            reformat_link(this);
        });

        if(elapsed > time) {t.stop()}
    }, 5);
}
function reformat_link(this_link){
    //Reposition endpoints
    d3.select(this_link).select('line')
        .attr('x1', function(d){
            var target = d3.select('[id=node_' + d.target + ']'),
                target_data = target.data()[0];

            if (target.data()[0].answering){
                var x2 = target_data.x + target_data.width/2 + d.xp,
                    y2 = target_data.y + target_data.height/2 + d.yp;
                if (d.x2-d.x1>0){var ang = Math.atan((y2-d.y1)/(x2-d.x1))}else{var ang = Math.atan((y2-d.y1)/(x2-d.x1)) - 3.14}
                // console.log(9,d.x1)
            }else{
                if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            }
            var source = d3.select('[id=node_' + d.source + ']'),
                x1 = source.data()[0].width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = source.data()[0].height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) - 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.x1 + x1}else{return d.x1 + x2}
        })
        .attr('y1', function(d){
            var target = d3.select('[id=node_' + d.target + ']'),
                target_data = target.data()[0];

            if (target_data.answering){
                var x2 = target_data.x + target_data.width/2 + d.xp,
                    y2 = target_data.y + target_data.height/2 + d.yp;

                if (d.x2-d.x1>0){var ang = Math.atan((y2-d.y1)/(x2-d.x1))}else{var ang = Math.atan((y2-d.y1)/(x2-d.x1)) - 3.14}
            }else{
                if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            }
            var source = d3.select('[id=node_' + d.source + ']'),
                x1 = source.data()[0].width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = source.data()[0].height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) - 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.y1 + y1}else{return d.y1 + y2}
        })
        .attr('x2', function(d){
            var target = d3.select('[id=node_' + d.target + ']'),
                target_data = target.data()[0];

            if (target.data()[0].answering){
                return target_data.x + d.xp + target_data.width - 5
            }

            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var x1 = target.data()[0].width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = target.data()[0].height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) + 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.x2 - x1}else{return d.x2 - x2}
        })
        .attr('y2', function(d){
            var target = d3.select('[id=node_' + d.target + ']'),
                target_data = target.data()[0];

            if (target.data()[0].answering){
                return target.data()[0].y + d.yp + target.data()[0].height/2
            }

            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var x1 = target.data()[0].width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = target.data()[0].height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) + 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.y2 - y1}else{return d.y2 - y2}
        }
        );
    //Move label
    d3.select(this_link).select('text')
        .attr("transform", function(d) {
            var line = d3.select(this.parentNode).select('line'),
                x1 = parseFloat(line.attr('x1')),
                y1 = parseFloat(line.attr('y1')),
                x2 = parseFloat(line.attr('x2')),
                y2 = parseFloat(line.attr('y2')),
                x = (x1 + x2) / 2,
                y = (y1 + y2) / 2;

            if (x2-x1>0){var ang = Math.atan((y2-y1)/(x2-x1))}else{var ang = Math.atan((y2-y1)/(x2-x1)) - 3.14}

            return "translate(" + x + ", " + y + ") rotate(" + ang*180/3.14 + ")";
        });
}

// function starting_positions(nodes, edges, width, height){
//     // Question node sits at the top
//     nodes[0]['x'] = width/2;
//     nodes[0]['y'] = 30;
//     nodes[0]['fixed'] = true;
//
//     //
//
//     // find number of connections on each node
//     var node_ids = nodes.map(function(node){return node.id});
//     for (e in edges){
//         var s = $.inArray(edges[e].source, node_ids),
//             t = $.inArray(edges[e].source, node_ids);
//
//         if (!nodes[s].hasOwnProperty('numlinks')){nodes[s]['numlinks'] = 0; nodes[s]['assigned']=0; nodes[s]['ang']=0}
//         if (!nodes[t].hasOwnProperty('numlinks')){nodes[t]['numlinks'] = 0; nodes[t]['assigned']=0; nodes[t]['ang']=0}
//
//         nodes[s].numlinks++;
//         nodes[t].numlinks++;
//     }
//
//     // define recursive function to find connectedness
//     function graph_connectedness(node, nodes, edges, node_ids){
//         // define function to sort list of pairs of connected neighbors by "most connected"
//         function connectedness(arr){
//             var res = [],
//                 neighbors = [];
//             for (i in arr){ for (j in arr){ if (i<j) {
//                 res.push(arr[i].filter(function(x){return $.inArray(x,arr[j]) != -1}).length);
//                 neighbors.push([i,j]);
//             }}}
//
//             var sort_indices = new Array(neighbors.length);
//             for (var i = 0; i < neighbors.length; ++i) sort_indices[i] = i;
//             sort_indices.sort(function (a, b) { return res[a] > res[b] ? -1 : res[a] < res[b] ? 1 : 0; });
//
//             return sort_indices.map(function(i){return neighbors[i]});
//         }
//
//         var child_edges = [],
//             child_nodes = [],
//             descendants = [];
//
//         for (e in edges){
//             if (edges[e].target == nodes[node]){
//                 child_edges.push(e);
//                 child_nodes.push($.inArray(edges[e].source, node_ids))
//             }
//         }
//
//         for (n in child_nodes){descendants.push(graph_connectedness(child_nodes[n], nodes, edges, node_ids))}
//         nodes['child_nodes'] = child_nodes;
//         nodes['child_ordering'] = connectedness(descendants);
//
//         // if this node connects branches, i.e. connects outward to two other nodes, return it's index
//         if (edges.filter(function(e){edges[e].source==nodes[node]}).length > 1){
//             return descendants.reduce(function(x,y){return x.concat(y)}).concat(node)
//         }else {
//             return descendants.reduce(function (x, y) { return x.concat(y) })
//         }
//     }
//
//     // find nodes connected to head
//     var completed = [49];
//
//     var nodes_of_interest = [];
//     for (var e=0; e<edges.length; e++) {
//         if (edges[e].target == nodes[0].id && $.inArray(edges[e].source, completed) == -1) {
//             nodes_of_interest.push(edges[e].source)
//         }
//     }
//
//     // random positions
//     for (var n=0; n<nodes.length; n++){
//         if (n==0){
//             // nodes[n]['x'] = width / 2;
//             // nodes[n]['y'] = height / 2;
//             // nodes[n]['fixed'] = true;
//         }else {
//             nodes[n]['x'] = width * Math.random();
//             nodes[n]['y'] = height * Math.random();
//             // nodes[n]['x'] = width/2 + Math.random();
//             // nodes[n]['y'] = height/2 + Math.random();
//             nodes[n]['fixed'] = false;
//         }
//         // nodes[n]['id'] = n;
//         nodes[n]['xt'] = 0;
//         nodes[n]['yt'] = 0;
//     }
//
//     return [nodes, edges]
// }

function make_panels(svg, width, height){
    // Question panel
    var main = svg.selectAll('.main')
        .data([{'main':0}]).enter().append('g')
        .classed('main', true);

    var post = main.append('rect')
        .classed('post_panel', true)
        .attr('y', 300)
        .attr('width',width)
        .attr('height', height-300)
        .style('fill', 'yellow')
        .call(drag_this);

    var answer = main.append('rect')
        .classed('answer_panel', true)
        .attr('y', 100)
        .attr('width',width)
        .attr('height', 200)
        .style('fill', 'orange')
        .call(drag_LR);

    var question = main.append('rect')
        .classed('question_panel', true)
        .attr('width',width)
        .attr('height', 100)
        .style('fill', 'green');

    return [post, answer, question]
}
function make_nodes(panel, data, fixed, classed, center){
    var colors = {
        'post_node': '#9AD1D4',
        'answer_node': '#9AD1D4',
        'question_node': '#F1F5F5',
        'comment_node': 'white'
    }
    var nodes = panel.selectAll('.node')
        .data(data).enter().append('g')
        .attr('id', function(d){ return 'node_' + d.id})
        .classed('fixed', fixed)
        .classed('a_node', true)
        .classed(classed, true);

    var boxes = nodes.append('rect').classed('border_rect', true)
        .attr('width', 5).attr('height', 5)
        .style('fill', colors[classed])
        .style('stroke', 'black')
        .attr('x', function(d){ return d.x})
        .attr('y', function(d){ return d.y})
        .attr("rx", 8).attr("ry", 8);

    var html = nodes.append('foreignObject')
        .attr('x', function(d){ return d.x })
        .attr('y', function(d){ return d.y })

    html.append('xhtml:div')
        .classed('node_content', true)
        .attr('id', function(d){ return 'div_' + d.id})
        .html(function(d) { return post_html(d) })

    html.attr('width', function(d) {return document.getElementById('div_' + d.id).getBoundingClientRect().width})
        .attr('height', function(d) {return document.getElementById('div_' + d.id).getBoundingClientRect().height})

    // resize_borders(groups);     *Someday*
    boxes.attr("x", function() { return this.parentNode.getBBox().x - 5 })
        .attr("y", function() { return this.parentNode.getBBox().y - 3 })
        .attr("width", function() { return this.parentNode.getBBox().width + 10 })
        .attr("height", function() { return this.parentNode.getBBox().height + 6 });


    if (center){
        nodes.each(function(d){
            d.x = this.getBBox().x + 5;
            d.x -= this.getBBox().width/2;
        })
            .attr("transform", function(d){ return "translate(" +  (- this.getBBox().width/2) + ",0)"})
            .attr('x', function(d){ return d.x });
    }

    nodes.each(function(d){
        d.height = this.getBBox().height
        d.width = this.getBBox().width
        d.xt = 0
        d.yt = 0
    })

    return nodes
}
function make_links(edges, stb){
    var links = d3.select('.main').selectAll('.edge')
        .data(edges).enter().append('g')
        .attr('source', function(d){ return d.source})
        .attr('target', function(d){ return d.target})
        .classed('link', true)
        .each(function(d){
            var source = d3.select('[id=node_' + d.source + ']'),
                target = d3.select('[id=node_' + d.target + ']');

            d.x1 = source.data()[0].x + source.data()[0].width/2 - 5;
            d.y1 = source.data()[0].y + source.data()[0].height/2 + 1;
            d.x2 = target.data()[0].x + target.data()[0].width/2 - 5;
            d.y2 = target.data()[0].y + target.data()[0].height/2 + 1;

            if (d.type == "CHALLENGE"){
                line = d3.select(this).append('line')
                    .attr("marker-end", "url(#arrow)")
                    // .style('stroke','black').style('stroke-width',function(d){return d.width});
                    .style('stroke','black')
                    .style('stroke-width',function(d){return 2})
                    .style("stroke-dasharray", ("3, 3"));
            }else {
                line = d3.select(this).append('line')
                    .attr("marker-end", "url(#arrow)")
                    // .style('stroke','black').style('stroke-width',function(d){return d.width});
                    .style('stroke', 'black')
                    .style('stroke-width', function (d) {return 2})
            }

            d3.select(this).append('text')
                .text(function(d){ return d.type })
                .attr('text-anchor','middle')
                .attr('opacity',0)
                .classed('link-label', true)
                .on('click', function(d){
                    open_socket().emit('tobbl', d.id)
                });

            d3.select(this)
                .on('mouseover', function(){
                    // console.log(d3.select(this).select('.link-label'))
                    d3.select(this).select('text')
                        .attr('opacity',1)
                })
                .on('mouseout', function(){
                    var link = d3.select(this).select('.link-label'),
                        t = d3.timer(function(elapsed){
                            link.attr('opacity',parseFloat(link.attr('opacity'))*0.85)
                        if(elapsed > 400) {
                            link.attr('opacity',0)
                            t.stop()
            }})})

            reformat_link(this);
            if (stb) {
                send_to_back(this);
            }
            // send link to back
        });

    // define arrow tip
    d3.select('svg').append("svg:defs").selectAll("marker")
        .data(["arrow"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    return links
}

function add_answer_button(){
    var height = parseInt(d3.select('svg').style('height').match(/\d+/)[0])
    d3.select('.answer_button').remove()

    // var y = 0;
    // d3.selectAll('.answer_node').each(function(d){
    //     y = Math.max(y,d.y + d.height + d.yt)
    // })

    var answer_button = d3.select('.answer_footer')
        .append('g')
        .classed('answer_button', true);

    answer_button
        .append('rect')
        .attr('width', 106)
        .attr('height', 30)
        .style('fill', 'white')
        .style('stroke', 'black')
        .attr('x', 79)
        .attr('y', height - 43)

    answer_button
        .append('text')
        .attr('x', 88)
        .attr('y', height - 23)
        .text('New answer');

    answer_button
        .on('click', function(){
            var button =  d3.select(this);

            d3.select(this).html('');

            var answer_box = button.append('foreignObject');

            answer_box.append('xhtml:div')
                .classed('answer_box', true)
                .attr('id', "answer_box")
                .html('<textarea cols="40" id="text_answer"></textarea>' +
                      '<button onclick="submit_post(true)">Submit</button>' +
                      '<button onclick="add_answer_button()">Cancel</button>')

            var bcr = document.getElementById("answer_box").getBoundingClientRect()

            answer_box.attr('width', 250)
                .attr('height', bcr.height)
                .attr('x', 5)
                .attr('y', height-85);

            button.on('click', function(){})
        })
}


d3.button = function() {

  var dispatch = d3.dispatch('press', 'release');

  var padding = 10,
      radius = 10,
      stdDeviation = 5,
      offsetX = 2,
      offsetY = 4;

  function my(selection) {
    selection.each(function(d, i) {
      var g = d3.select(this)
          .attr('id', 'd3-button' + i)
          .attr('transform', 'translate(' + d.x + ',' + d.y + ')');

      var text = g.append('text').text(d.label);
      var defs = g.append('defs');
      var bbox = text.node().getBBox();
      var rect = g.insert('rect', 'text')
          .attr("x", bbox.x - padding)
          .attr("y", bbox.y - padding)
          .attr("width", bbox.width + 2 * padding)
          .attr("height", bbox.height + 2 * padding)
          .attr('rx', radius)
          .attr('ry', radius)
          .on('mouseover', activate)
          .on('mouseout', deactivate)
          .on('click', toggle)

       addShadow.call(g.node(), d, i);
       addGradient.call(g.node(), d, i);
    });
  }

  function addGradient(d, i) {
    var defs = d3.select(this).select('defs');
    var gradient = defs.append('linearGradient')
        .attr('id', 'gradient' + i)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

    gradient.append('stop')
        .attr('id', 'gradient-start')
        .attr('offset', '0%')

    gradient.append('stop')
        .attr('id', 'gradient-stop')
        .attr('offset', '100%')

    d3.select(this).select('rect').attr('fill', 'url(#gradient' + i + ")" );
  }

  function addShadow(d, i) {
    var defs = d3.select(this).select('defs');
    var rect = d3.select(this).select('rect').attr('filter', 'url(#dropShadow' + i + ")" );
    var shadow = defs.append('filter')
        .attr('id', 'dropShadow' + i)
        .attr('x', rect.attr('x'))
        .attr('y', rect.attr('y'))
        .attr('width', rect.attr('width') + offsetX)
        .attr('height', rect.attr('height') + offsetY)

    shadow.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 2)

    shadow.append('feOffset')
        .attr('dx', offsetX)
        .attr('dy', offsetY);

    var merge = shadow.append('feMerge');

    merge.append('feMergeNode');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  function activate() {
    var gradient = d3.select(this.parentNode).select('linearGradient')
    d3.select(this.parentNode).select("rect").classed('active', true)
    if (!gradient.node()) return;
    gradient.select('#gradient-start').classed('active', true)
    gradient.select('#gradient-stop').classed('active', true)
  }

  function deactivate() {
    var gradient = d3.select(this.parentNode).select('linearGradient')
    d3.select(this.parentNode).select("rect").classed('active', false)
    if (!gradient.node()) return;
    gradient.select('#gradient-start').classed('active', false);
    gradient.select('#gradient-stop').classed('active', false);
  }

  function toggle(d, i) {
    if (d3.select(this).classed('pressed')) {
        release.call(this, d, i);
        deactivate.call(this, d, i);
    } else {
        press.call(this, d, i);
        activate.call(this, d, i);
    }
  }

  function press(d, i) {
    dispatch.call('press', this, d, i)
    d3.select(this).classed('pressed', true);
    var shadow = d3.select(this.parentNode).select('filter')
    if (!shadow.node()) return;
    shadow.select('feOffset').attr('dx', 0).attr('dy', 0);
    shadow.select('feGaussianBlur').attr('stdDeviation', 0);
  }

  function release(d, i) {
    dispatch.call('release', this, d, i)
    my.clear.call(this, d, i);
  }

  my.clear = function(d, i) {
    d3.select(this).classed('pressed', false);
    var shadow = d3.select(this.parentNode).select('filter')
    if (!shadow.node()) return;
    shadow.select('feOffset').attr('dx', offsetX).attr('dy', offsetY);
    shadow.select('feGaussianBlur').attr('stdDeviation', stdDeviation);
  }

  my.on = function() {
    var value = dispatch.on.apply(dispatch, arguments);
    return value === dispatch ? my : value;
  };

  return my;
}