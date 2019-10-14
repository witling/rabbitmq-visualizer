window.addEventListener('DOMContentLoaded', function () {
    'use strict';
    // using backwards-compatible javascript because windows server
    // runs very old version of ie.
    var default_api_host = 'http://localhost:15672/api';
    var default_api_username = 'visualizer';
    var default_api_password = 'NoPasswordHere';

    function load_cookies() {
        var cookies = {};
        /*
        var kv_pairs = document.cookie.split(';');
        for (var i in kv_pairs) {
            var parts = kv_pairs[i].split('=');
            cookies[parts[0]] = parts[1];
        }
        */
        cookies['host'] = default_api_host;
        cookies['username'] = default_api_username;
        cookies['password'] = default_api_password;
        return cookies;
    }

    function save_cookies(cookies) {
        // set cookie for a year
        var date = new Date();
        date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));

        for (var k in cookies) {
            var v = cookies[k];
            document.cookie += k + '=' + v + '; expires=' + date.toUTCString() + ';path=/';
        }
    }

    function load_settings() {
        host.val(cookies['host']);
        username.val(cookies['username']);
        password.val(cookies['password']);
    }

    function save_settings() {
        cookies['host'] = host.val();
        cookies['username'] = username.val();
        cookies['password'] = password.val();
        save_cookies(cookies);
    }

    function set_host() {
        var new_api_host = window.prompt('specify the rabbitmq host like <address>:<port>/<api_path>', cookies['host'] || default_api_host);
        cookies['host'] = new_api_host;
        save_cookies(cookies);
        return cookies['host'];
    }

    var cookies = load_cookies();
    var host = $("#config-host");
    var username = $("#config-username");
    var password = $("#config-password");
    cookies['host'] || set_host();
    load_settings();

    function err(msg) {
        console.log(msg);
    }

    // TODO: make async
    function load(path, handler, err_handler) {
        var uri = cookies['host'] + path;
        var request = new XMLHttpRequest();
        var auth = cookies['username'] + ':' + cookies['password'];
        /*
        request.onreadystatechange = function() {
            if(this.readyState === 4 && this.status === 200) {
                handler(JSON.parse(request.responseText));
            } else {
                (err_handler || err)(request.responseText);
            }
        }
        */
        request.open('GET', uri, false);
        request.setRequestHeader('Authorization', 'Basic ' + btoa(auth));
        request.send();

        if (request.status === 200) {
            return JSON.parse(request.responseText);
        } else {
            return null;
        }
    }

    function display(nodes, edges) {
        var cy = cytoscape({
            'container': document.getElementById('overview'),
            'style': [{
                'selector': '[ty = "exchange"]',
                'css': {
                    'background-color': 'red',
                    'shape': 'rectangle',
                }
            },
            {
                'selector': '[ty = "consumer"]',
                'css': {
                    'background-color': 'purple',
                    'shape': 'diamond',
                }
            },
            {
                'selector': '.label',
                'style': {
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                }
            },
            {
                'selector': 'node[label]',
                'style': {
                    'label': 'data(label)',
                }
            },
            {
                'selector': 'edge',
                'style': {
                    'label': 'data(label)',
                    'curve-style': 'bezier',
                }
            }
            ],
            elements: {
                nodes: nodes,
                edges: edges,
            }
        });

        // enables a context menu on nodes of type 'queue'
        cy.cxtmenu({
            selector: '[ty = "queue"]',
            commands: [{
                content: '<span>on</span>',
                select: function (ele) {
                    alert(ele);
                }
            },
            {
                content: '<span>off</span>',
                select: function (ele) {
                    alert(ele);
                }
            }
            ]
        });

        var options = {
            name: 'klay',
            padding: 50,
            klay: {
                spacing: 150,
            }
        };
        var layout = cy.layout(options);

        layout.run();

        cy.minZoom(1);
        cy.maxZoom(4);
        cy.elements('node[ty = "exchange"]')
            .forEach(function (n) {
                if (n.neighborhood().length === 0) {
                    n.hide();
                }
            });
    }

    function join_arguments(args) {
        var buffer = "";
        for (var k in args) {
            var v = args[k];
            if (buffer) {
                buffer += ','
            }
            buffer += k + ': ' + v;
        }
        return buffer ? '{ ' + buffer + ' }' : null;
    }

    function spawn_nodes(nodes, list, label_fn, ty, cls) {
        for (var i in list) {
            var info = list[i];

            if (info.name === '') {
                info.name = '<<default>>';
            }

            var label = label_fn(info);
            var node = { data: { label: label, id: info.name, name: info.name, ty: ty } };

            if (cls !== undefined) {
                node.classes = cls;
            }

            nodes.push(node);
        }
    }

    function build() {
        var exchanges = load('/exchanges');
        var bindings = load('/bindings');
        var queues = load('/queues');
        var consumers = load('/consumers');

        var nodes = [];
        var edges = [];

        spawn_nodes(nodes, exchanges, function (ex) { return ex.name + ' (' + ex.type + ')'; }, 'exchange');
        spawn_nodes(nodes, queues, function (qu) { return qu.name; }, 'queue', 'label');

        var added_consumers = {};
        for (var i in consumers) {
            var consumer = consumers[i];
            var id = consumer.channel_details.connection_name;

            if (!added_consumers[id]) {
                nodes.push({ data: { label: id, id: id, name: id, ty: 'consumer' }, classes: 'label' });
                added_consumers[id] = true;
            }
            edges.push({ data: { source: consumer.queue.name, target: id, ty: 'binding-consumer' } });
        }

        for (var i in bindings) {
            var binding = bindings[i];

            if (binding.source === '') {
                binding.source = '<<default>>';
                continue;
            }

            if (binding.source && binding.destination) {
                var label = binding.routing_key;
                var subquery = join_arguments(binding.arguments);
                if (subquery) {
                    label += ' ' + subquery;
                }
                edges.push({ data: { label: label, source: binding.source, target: binding.destination, ty: 'binding' }, classes: 'label' });
            }
        }

        display(nodes, edges);
    }

    var config_dialog = $('#config-dialog').dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            'Save': save_settings,
            Cancel: function () {
                config_dialog.dialog('close');
            }
        }
    });
    config_dialog.find('form').on('submit', function (evt) {
        event.preventDefault();
        save_settings();
    });

    var config = $('#config');
    config.button().on('click', function () {
        config_dialog.dialog('open');
    });

    build();
});