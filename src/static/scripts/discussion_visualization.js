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

    socket.on('render_features', function(data) {
        render_features(data);
    });

    socket.on('connect', function() {
        socket.emit(window.location.href);
        console.log(window.location.href)
    });

    socket.emit('render_features', {'question_id': 48});
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
            .attr("transform", "translate(" + (d3.event.x - d.x1)  + "," + (d3.event.y - d.y1) + ")");

            d.xt = d3.event.x - d.x1;
            d.yt = d3.event.y - d.y1;
        });

function drag_with_links(groups, links) {
    return d3.drag().subject(this)
        .on('start', function (d) {
            // if (d.x1){
            d.x1 = d3.event.x - d.xt;
            d.y1 = d3.event.y - d.yt;
            // }else{
            //     d.x1 = d3.event.x;
            //     d.y1 = d3.event.y;
            // }
        })
        .on('drag', function (d) {
            d.xt = d3.event.x - d.x1;
            d.yt = d3.event.y - d.y1;

            d3.select(this)
                .attr("transform", "translate(" + (d3.event.x - d.x1) + "," + (d3.event.y - d.y1) + ")");

            d3.selectAll('[source="' + d.id + '"]')
                .each(function(d){
                    d.x1 = d.x1 + d3.event.dx;
                    d.y1 = d.y1 + d3.event.dy;
                });

            d3.selectAll('[target="' + d.id + '"]')
                .each(function(d){
                    d.x2 = d.x2 + d3.event.dx;
                    d.y2 = d.y2 + d3.event.dy;
                });

            links.each(function(d){
                reformat_link(this);
            });
        })
        .on('end', function () {
            equilibrate_nodes(groups, links, 500)
        });
}

function equilibrate_nodes(groups, links, time){
    var t = d3.timer(function(elapsed) {
        groups.each(function(d){ d.force = [0,0] });

        groups.each(function(d){
            // find center-to-center distance, closer --> more repulsive force
            var x = d3.select(this).node().getBBox().x + d3.select(this).node().getBBox().width/2 + d.xt,
                y = d3.select(this).node().getBBox().y + d3.select(this).node().getBBox().height/2 + d.yt,
                id = d.id;

            groups.each(function(d){
                if ((d.id != id) & (!d3.select(this).classed('fixed'))){
                    var dx = x - d3.select(this).node().getBBox().x - d3.select(this).node().getBBox().width/2 - d.xt,
                        dy = y - d3.select(this).node().getBBox().y - d3.select(this).node().getBBox().height/2 - d.yt,
                        dist = Math.sqrt(dx**2 + dy**2);

                    if (dx>0){var ang = Math.atan(dy/dx)}else{var ang = Math.atan(dy/dx) - 3.14}
                    // node-node repulsive force
                    d.force[0] -= Math.max(-100,Math.min(100,1 * Math.max(0,(300-dist)/10)**2 * Math.cos(ang)));
                    d.force[1] -= Math.max(-100,Math.min(100,1 * Math.max(0,(300-dist)/10)**2 * Math.sin(ang)));


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

            // bond forces
            if(!source.classed('fixed')){
                source.data()[0].force[0] -= Math.max(-100,Math.min(100,.08*(len-35) * dx**2/((1)*len**2) * dx/Math.abs(dx)));
                source.data()[0].force[1] -= Math.max(-100,Math.min(100,.08*(len-35) * dy**2/((1)*len**2) * dy/Math.abs(dy)));
            }if(!target.classed('fixed')){
                target.data()[0].force[0] += Math.max(-100,Math.min(100,.08*(len-35) * dx**2/((1)*len**2) * dx/Math.abs(dx)));
                target.data()[0].force[1] += Math.max(-100,Math.min(100,.08*(len-35) * dy**2/((1)*len**2) * dy/Math.abs(dy)));
            }
        });

        // apply forces
        groups
            .attr("transform", function(d){
                // d.force[0] = d.force[0] * Math.max(1,(500 - (time-elapsed))/100);
                // d.force[1] = d.force[1] * Math.max(1,(500 - (time-elapsed))/100);
                d.xt += d.force[0];
                d.yt += d.force[1];
                return "translate(" +  d.xt + "," + d.yt + ")"
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
        console.log(d3.select(parent.selectAll(':not(.border_rect)')));
        // var childs = parent.selectAll(':not(.border_rect)');
        // console.log(parent.filter(function(d){return d.classed()}));
        // console.log(d3.max(parent, function(d){return d.getBBox().width}));
        return 50
    });
    var width = childs.node().getBBox().width;


    console.log(width);
    //
}

function reformat_link(this_link){
    //Reposition endpoints
    d3.select(this_link).select('line')
        .attr('x1', function(d){
            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var source = d3.select('[id=node_' + d.source_id + ']'),
                x1 = source.node().getBBox().width/2 * (d.x2-d.x1)/Math.abs(d.x2-d.x1),
                y1 = x1 * Math.tan(ang),
                h1 = Math.sqrt(x1**2 + y1**2),
                y2 = source.node().getBBox().height/2 * (d.y2-d.y1)/Math.abs(d.y2-d.y1) - 5,
                x2 = y2 / Math.tan(ang),
                h2 = Math.sqrt(x2**2 + y2**2);
            console.log(source.node().getBBox().width);
            if (h1<h2){return d.x1 + x1}else{return d.x1 + x2}
        })
        .attr('y1', function(d){
            if (d.x2-d.x1>0){var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1))}else{var ang = Math.atan((d.y2-d.y1)/(d.x2-d.x1)) - 3.14}
            var source = d3.select('[id=node_' + d.source_id + ']'),
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
            var target = d3.select('[id=node_' + d.target_id + ']'),
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
            var target = d3.select('[id=node_' + d.target_id + ']'),
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

function render_features(features){
    var nodes = features.nodes,
        edges = features.edges,
        svg = d3.select("svg"),
        width = parseInt(svg.style('width').match(/\d+/)[0]),
        height = parseInt(svg.style('height').match(/\d+/)[0]);

    // assign random starting coordinates to each node
    for (var n=0; n<nodes.length; n++){
        if (n==0){
            nodes[n]['x'] = width / 2;
            nodes[n]['y'] = height / 2;
            nodes[n]['fixed'] = true;
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

    // assign numlinks, etc. to each node
    for (var l=0; l < features.edges.length; l++){
        var edge = edges[l];

        for (var n=0; n<nodes.length; n++){
            if (!nodes[n].hasOwnProperty('numlinks')){
                nodes[n]['numlinks'] = 0; nodes[n]['assigned']=0; nodes[n]['ang']=0}
            if ((nodes[n].name == edge.source) | (nodes[n].name == edge.target)){
                nodes[n]['numlinks']++; nodes[n]['assigned']++;}

            if (nodes[n].id == edge.source) {
                edges[l].source_id = nodes[n].id}
            if (nodes[n].id == edge.target) {
                edges[l].target_id = nodes[n].id}
        }
    }
    console.log();

    // Make container to contain all objects
    var main = svg.selectAll('.main')
        .data([{'main':0}]).enter().append('g')
        .classed('main', true)
        .call(drag_this);

    main.append('circle')
        .classed('background', true)
        .attr('r',100000)
        .style('fill', 'transparent');

    // Generate nodes and append features
    var groups = main.selectAll('.node')
        .data(nodes).enter().append('g')
        .attr('id', function(d){ return 'node_' + d.id})
        .classed('fixed', function(d){ return d.fixed });

    var boxes = groups.append('rect').classed('border_rect', true)
        .attr('width', 5).attr('height', 5)
        .style('fill', 'white')
        .style('stroke', 'black')
        .attr('x', function(d){ return d.x})
        .attr('y', function(d){ return d.y});

    groups.append("text")
        .attr("x",function(d){ return d.x})
        .attr("y",function(d){ return d.y})
        .text(function(d) {return d.body})
        .attr('fill', 'black')
        .attr('font-size', '20px');
        // .attr('font-size', function(d){console.log(d.font);return d.font});

    // resize_borders(groups);     *Someday*
    boxes.attr("x", function() { return this.parentNode.getBBox().x - 5 })
        .attr("y", function() { return this.parentNode.getBBox().y - 3 })
        .attr("width", function() { return this.parentNode.getBBox().width + 10 })
        .attr("height", function() { return this.parentNode.getBBox().height + 6 });

    // Generate edges
    var links = main.selectAll('.link')
        .data(edges).enter().append('g')
        .attr('source', function(d){ return d.source_id})
        .attr('target', function(d){ return d.target_id})
        .each(function(d){
            console.log(d.target_id);
            var source = d3.select('[id=node_' + d.source_id + ']'),
                target = d3.select('[id=node_' + d.target_id + ']');

            d.x1 = source.data()[0].x + source.node().getBBox().width/2 - 5;
            d.y1 = source.data()[0].y;
            d.x2 = target.data()[0].x + target.node().getBBox().width/2 - 5;
            d.y2 = target.data()[0].y;

            console.log(d);
            console.log(d);


            d3.select(this).append('line')
                .attr("marker-end", "url(#arrow)")
                // .style('stroke','black').style('stroke-width',function(d){return d.width});
                .style('stroke','black').style('stroke-width',function(d){return 2});
            d3.select(this).append('text')
                .text(function(d){ return d.type })
                .attr('text-anchor','middle')
                .classed('link-label', true);

            reformat_link(this);

            // send links to back
            var firstChild = this.parentNode.firstChild;
            if (firstChild) {
                this.parentNode.insertBefore(this, firstChild);
            }
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

    // Animate nodes
    equilibrate_nodes(groups, links, 1500);
    groups.call(drag_with_links(groups,links));
}
