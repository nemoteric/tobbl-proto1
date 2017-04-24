/**
 * Created by samuel on 4/12/17.
 */

// Universal functions
function open_socket() {
    var namespace = '/_thread';
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
    return socket
}

function document_ready(){
    var socket = open_socket();

    socket.on('render_question', function(data) {
        render_question(data);
    });
    socket.on('connect', function() {
        socket.emit(window.location.href);
        console.log(window.location.href)
    });

    socket.emit('render_question', {'question_id': 2});
}

// Bahaviors
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
        .on('drag',function(d){
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

function drag_with_links(groups, links, LR) {
    return d3.drag().subject(this)
        .on('start', function (d) {
            if (d.x1){
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
                    .attr("transform", "translate(" + (d3.event.x - d.x1) + ",0)"); // + (d3.event.y - d.y1) + ")");
            }else{
                d3.select(this)
                    .attr("transform", "translate(" + (d3.event.x - d.x1) + "," + (d3.event.y - d.y1) + ")");
            }

            groups.each(function(d) {
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
                        if(!LR){
                             d.y2 = d.y2 + d3.event.dy;
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

function send_to_back(item){
    var firstChild = item.parentNode.firstChild;
    if (firstChild) {
        item.parentNode.insertBefore(item.parentNode, firstChild);
    }
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

        // find edge-to-edge distance
        groups.each(function(d){
            var px = d3.select(this).node().getBBox().x + d.xt,
                py = d3.select(this).node().getBBox().y + d.yt,
                p_height = d3.select(this).node().getBBox().height,
                p_width = d3.select(this).node().getBBox().width,
                p_id = d.id;


            groups.each(function(d){
                if (d.id != p_id && !d3.select(this).classed('fixed')){
                    var cx = d3.select(this).node().getBBox().x + d.xt,
                        cy = d3.select(this).node().getBBox().y + d.yt,
                        c_height = d3.select(this).node().getBBox().height,
                        c_width = d3.select(this).node().getBBox().width,
                        dx = px - cx,
                        dy = py - cy,
                        dist = Math.sqrt(dx**2 + dy**2);
                    if (dx>0){var ang = Math.atan(dy/dx)}else{var ang = Math.atan(dy/dx) - 3.14}

                    // check if overlapping
                    if (((cx >= px && cx <= px + p_width) || (px >= cx && px <= cx + c_width)) &&
                        ((cy >= py && cy <= py + p_height) || (py >= cy && py <= cy + c_height))){
                        d.force[0] -= 10 * Math.cos(ang);
                        d.force[0] -= 10 * Math.sin(ang);
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
                source.data()[0].force[0] -= Math.max(-1,Math.min(1, (len - 125) * Math.cos(ang)));
                source.data()[0].force[1] -= Math.max(-1,Math.min(1, (len - 125) * Math.sin(ang)));
            }if(!target.classed('fixed')){
                target.data()[0].force[0] += Math.max(-1,Math.min(1, (len - 125) * Math.cos(ang)));
                target.data()[0].force[1] += Math.max(-1,Math.min(1, (len - 125) * Math.sin(ang)));
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

function resize_borders(groups) {
    // SELECT ALL CHILD NODES EXCEPT THE BOUNDING RECT
    // console.log(group)
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

function reformat_link(this_link){
    //Reposition endpoints
    d3.select(this_link).select('line')
        .attr('x1', function(d){
            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var source = d3.select('[id=node_' + d.source + ']'),
                x1 = source.node().getBBox().width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = source.node().getBBox().height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) - 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.x1 + x1}else{return d.x1 + x2}
        })
        .attr('y1', function(d){
            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var source = d3.select('[id=node_' + d.source + ']'),
                x1 = source.node().getBBox().width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = source.node().getBBox().height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) - 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.y1 + y1}else{return d.y1 + y2}
        })
        .attr('x2', function(d){
            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var target = d3.select('[id=node_' + d.target + ']'),
                x1 = target.node().getBBox().width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = target.node().getBBox().height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) + 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            if (h1<h2){return d.x2 - x1}else{return d.x2 - x2}
        })
        .attr('y2', function(d){
            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var target = d3.select('[id=node_' + d.target + ']'),
                x1 = target.node().getBBox().width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = target.node().getBBox().height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) + 5,
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

function starting_positions(nodes, edges, width, height){
    // Question node sits at the top
    nodes[0]['x'] = width/2;
    nodes[0]['y'] = 30;
    nodes[0]['fixed'] = true;

    //

    // find number of connections on each node
    var node_ids = nodes.map(function(node){return node.id});
    for (e in edges){
        var s = $.inArray(edges[e].source, node_ids),
            t = $.inArray(edges[e].source, node_ids);

        if (!nodes[s].hasOwnProperty('numlinks')){nodes[s]['numlinks'] = 0; nodes[s]['assigned']=0; nodes[s]['ang']=0}
        if (!nodes[t].hasOwnProperty('numlinks')){nodes[t]['numlinks'] = 0; nodes[t]['assigned']=0; nodes[t]['ang']=0}

        nodes[s].numlinks++;
        nodes[t].numlinks++;
    }

    // define recursive function to find connectedness
    function graph_connectedness(node, nodes, edges, node_ids){
        // define function to sort list of pairs of connected neighbors by "most connected"
        function connectedness(arr){
            var res = [],
                neighbors = [];
            for (i in arr){ for (j in arr){ if (i<j) {
                res.push(arr[i].filter(function(x){return $.inArray(x,arr[j]) != -1}).length);
                neighbors.push([i,j]);
            }}}

            var sort_indices = new Array(neighbors.length);
            for (var i = 0; i < neighbors.length; ++i) sort_indices[i] = i;
            sort_indices.sort(function (a, b) { return res[a] > res[b] ? -1 : res[a] < res[b] ? 1 : 0; });

            return sort_indices.map(function(i){return neighbors[i]});
        }

        var child_edges = [],
            child_nodes = [],
            descendants = [];

        for (e in edges){
            if (edges[e].target == nodes[node]){
                child_edges.push(e);
                child_nodes.push($.inArray(edges[e].source, node_ids))
            }
        }

        for (n in child_nodes){descendants.push(graph_connectedness(child_nodes[n], nodes, edges, node_ids))}
        nodes['child_nodes'] = child_nodes;
        nodes['child_ordering'] = connectedness(descendants);

        // if this node connects branches, i.e. connects outward to two other nodes, return it's index
        if (edges.filter(function(e){edges[e].source==nodes[node]}).length > 1){
            return descendants.reduce(function(x,y){return x.concat(y)}).concat(node)
        }else {
            return descendants.reduce(function (x, y) { return x.concat(y) })
        }
    }

    // find nodes connected to head
    var completed = [49];

    var nodes_of_interest = [];
    for (var e=0; e<edges.length; e++) {
        if (edges[e].target == nodes[0].id && $.inArray(edges[e].source, completed) == -1) {
            nodes_of_interest.push(edges[e].source)
        }
    }


    // for (n in nodes_of_interest){
    //     node
    //     completed.push(nodes_of_interest[n])
    // }

    console.log([1,2].filter(function(x){return $.inArray(x,[1,2,3]) != -1}));
    console.log(nodes_of_interest);




    // random positions
    for (var n=0; n<nodes.length; n++){
        if (n==0){
            // nodes[n]['x'] = width / 2;
            // nodes[n]['y'] = height / 2;
            // nodes[n]['fixed'] = true;
        }else {
            nodes[n]['x'] = width * Math.random();
            nodes[n]['y'] = height * Math.random();
            // nodes[n]['x'] = width/2 + Math.random();
            // nodes[n]['y'] = height/2 + Math.random();
            nodes[n]['fixed'] = false;
        }
        // nodes[n]['id'] = n;
        nodes[n]['xt'] = 0;
        nodes[n]['yt'] = 0;
    }

    return [nodes, edges]
}

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

function render_question(features){
    var nodes = features.nodes,
        edges = features.edges,
        relevant = features.relevant,
        svg = d3.select("svg"),
        max_width = 300,
        width = parseInt(svg.style('width').match(/\d+/)[0]),
        height = parseInt(svg.style('height').match(/\d+/)[0]);


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
        .attr('y', 100)
        .attr('width',width)
        .attr('height', height-100)
        .style('fill', 'transparent');

    var question_panel = main.selectAll('.question_panel')
        .data([{'data':0}]).enter().append('g')
        .classed('post_panel', true);

    question_panel
        .append('rect')
        .attr('width',width)
        .attr('height', 100)
        .style('fill', 'green');


    //// separate nodes by type
    var answers = [];
    var posts = [];
    for (n in nodes){
        if (nodes[n]['type']=='Question'){var question = nodes[n]}
        else if (nodes[n]['answering']){answers.push(nodes[n])}
        else {posts.push(nodes[n])}
    }


    //// Question
    question['x'] = width/2;
    question['y'] = 50;

    var question_node = question_panel.selectAll('.node')
        .data([question]).enter().append('g')
        .attr('id', function(d){ return 'node_' + d.id})
        .classed('fixed', true)
        .classed('question_node', true);

    var question_boxes = question_node.append('rect').classed('border_rect', true)
        .attr('width', 5).attr('height', 5)
        .style('fill', 'white')
        .style('stroke', 'black')
        .attr('x', function(d){ return d.x})
        .attr('y', function(d){ return d.y});

    question_node.append("text")
        .attr("x",function(d){ return d.x})
        .attr("y",function(d){ return d.y})
        .text(function(d) {return d.body})
        .attr('fill', 'black')
        .attr('font-size', '20px');
        // .attr('font-size', function(d){console.log(d.font);return d.font});

    // resize_borders(groups);     *Someday*
    question_boxes.attr("x", function() { return this.parentNode.getBBox().x - 5 })
        .attr("y", function() { return this.parentNode.getBBox().y - 3 })
        .attr("width", function() { return this.parentNode.getBBox().width + 10 })
        .attr("height", function() { return this.parentNode.getBBox().height + 6 });

    question_node
        .each(function(d){
            d.x -= this.getBBox().width/2
        })
        .attr("transform", function(d){ return "translate(" +  (- this.getBBox().width/2) + ",0)"})
        .attr('x', function(d){ return d.x});


    //// Answers
    answers.sort(function(a,b){
        if (a['score'] > b['score']){return -1}
        else {return 0}
    });

    var answer_ids = [];
    for (var a=0; a < answers.length; a++){
        answers[a]['x'] = a*max_width+max_width/2;
        answers[a]['y'] = 150;
        answer_ids.push(answers[a].id)
    }

    var answer_nodes = post_panel.selectAll('.node')
        .data(answers).enter().append('g')
        .attr('id', function(d){ return 'node_' + d.id})
        .classed('fixed', true);

    var answer_boxes = answer_nodes.append('rect').classed('border_rect', true)
        .attr('width', 5).attr('height', 5)
        .style('fill', 'white')
        .style('stroke', 'black')
        .attr('x', function(d){ return d.x})
        .attr('y', function(d){ return d.y});

    answer_nodes.append("text")
        .attr("x",function(d){ return d.x})
        .attr("y",function(d){ return d.y})
        .text(function(d) {return d.body})
        .attr('fill', 'black')
        .attr('font-size', '20px');
        // .attr('font-size', function(d){console.log(d.font);return d.font});

    // resize_borders(groups);     *Someday*
    answer_boxes.attr("x", function() { return this.parentNode.getBBox().x - 5 })
        .attr("y", function() { return this.parentNode.getBBox().y - 3 })
        .attr("width", function() { return this.parentNode.getBBox().width + 10 })
        .attr("height", function() { return this.parentNode.getBBox().height + 6 });


    //// Starting position of posts (inherit from parents method)
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
                    for (var e=0; e<edges.length; e++){
                        if (edges[e]['source']==child_id) {
                            var parent = nodes.filter(function (obj) {return obj.id == edges[e].target});
                            // console.log(JSON.stringify(parent))
                            parent_x.push(parent[0]['x']);
                            parent_y.push(parent[0]['y']);
                        }
                    }
                    child_node[0]['x'] = parent_x.reduce(function(a,b){return a+b})/parent_x.length;
                    child_node[0]['y'] = parent_y.reduce(function(a,b){return a+b})/parent_x.length + 100;

                    done.push(child_id)
                    up_next.push(child_id)
                }
            }
        }
        if (up_next.length > 0){
            done = inherit_position(up_next, done, nodes, edges);
        }
        return done
    }
    inherit_position(answer_ids, [], nodes, edges);

    var post_nodes = post_panel.selectAll('.node')
        .data(posts).enter().append('g')
        .attr('id', function(d){ return 'node_' + d.id})
        .classed('fixed', function(d){ return d.fixed });

    var post_boxes = post_nodes.append('rect').classed('border_rect', true)
        .attr('width', 5).attr('height', 5)
        .style('fill', 'white')
        .style('stroke', 'black')
        .attr('x', function(d){ return d.x})
        .attr('y', function(d){ return d.y});

    post_nodes.append("text")
        .attr("x",function(d){ return d.x})
        .attr("y",function(d){ return d.y})
        .text(function(d) {return d.body})
        .attr('fill', 'black')
        .attr('font-size', '20px');
        // .attr('font-size', function(d){console.log(d.font);return d.font});

    // resize_borders(groups);     *Someday*
    post_boxes.attr("x", function() { return this.parentNode.getBBox().x - 5 })
        .attr("y", function() { return this.parentNode.getBBox().y - 3 })
        .attr("width", function() { return this.parentNode.getBBox().width + 10 })
        .attr("height", function() { return this.parentNode.getBBox().height + 6 });


    //// Links
    var links = main.selectAll('.link')
        .data(edges).enter().append('g')
        .attr('source', function(d){ return d.source})
        .attr('target', function(d){ return d.target})
        .each(function(d){
            var source = d3.select('[id=node_' + d.source + ']'),
                target = d3.select('[id=node_' + d.target + ']');

            d.x1 = source.data()[0].x + source.node().getBBox().width/2 - 5;
            d.y1 = source.data()[0].y;
            d.x2 = target.data()[0].x + target.node().getBBox().width/2 - 5;
            d.y2 = target.data()[0].y;


            d3.select(this).append('line')
                .attr("marker-end", "url(#arrow)")
                // .style('stroke','black').style('stroke-width',function(d){return d.width});
                .style('stroke','black').style('stroke-width',function(d){return 2});
            d3.select(this).append('text')
                .text(function(d){ return d.type })
                .attr('text-anchor','middle')
                .classed('link-label', true);

            reformat_link(this);

            // send link to back
            // send_to_back(this);
        });

     // define arrow tip
    svg.append("svg:defs").selectAll("marker")
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


    //// Final touches
    var all_postpanel_nodes = post_panel.selectAll('g')
    post_panel.call(drag_with_links(all_postpanel_nodes, links, true));
    equilibrate_nodes(all_postpanel_nodes, links, 5000);
}
