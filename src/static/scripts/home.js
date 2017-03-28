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

    socket.on('connect', function(){
        socket.emit('test' )
    });

    socket.on('render_home', function(json){
        render_home(json)
    });
}

function render_home(json){
    // console.log('rendering_home');
    var thread_div = document.getElementById("threads");
    var threads = json;

    for (var thread in threads){
        console.log(thread);
        $(`<div><a href="/thread/${thread}">${thread}</a></div>`).appendTo(thread_div);
    }

}