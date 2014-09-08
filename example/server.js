var server = require('../index').createServer({ router: { stripTrailingSlash: true } });

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
