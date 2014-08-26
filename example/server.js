var createServer = require('../index').createServer;

var server = createServer();

server.route({
    method: 'GET',
    path: '/',
    handler: function(request, reply) {
        reply('Hello World!');
    }
});

server.route({
    method: 'GET',
    path: '/kaboom',
    handler: function(request, reply) {
        goBoom();
    }
});

server.run();
