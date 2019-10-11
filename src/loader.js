json_load_from = function (uri) {
    var request = new XMLHttpRequest();
    request.open('GET', uri, false);
    request.send();

    if (request.status === 200) {
        return JSON.parse(request.responseText);
    } else {
        return null;
    }
};

(function () {
    'use strict';

    var deps = json_load_from('deps.json');

    for (var i in deps) {
        var dep = deps[i];
        var script_node = document.createElement('script');
        script_node.type = 'text/javascript';
        script_node.src = dep;
        document.body.appendChild(script_node);
    }
}())