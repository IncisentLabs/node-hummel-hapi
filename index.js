var cluster = require('cluster'),
    Hapi = require('hapi'),
    hummel = require('hummel'),
    settings = hummel.getSettings(),
    log = hummel.getLogger(),
    _reduce = require('lodash-node/modern/collections/reduce'),
    _defaults = require('lodash-node/modern/objects/defaults'),
    _pick = require('lodash-node/modern/objects/pick');

var ValidHapiOpts = ['app', 'cache', 'cors', 'security', 'debug', 'files', 'json', 'labels',
    'load', 'location', 'payload', 'plugins', 'router', 'state', 'timeout', 'tls', 'maxSockets',
    'validation', 'views'];

module.exports = {

    createServer: function(opts) {
        opts = opts || {};

        var serverOpts = hummel.getOptions(opts),
            hapiOpts = _defaults(_pick(opts, ValidHapiOpts), { debug: { request: false } }),
            port = serverOpts.port || settings.port,
            server = new Hapi.Server(port, hapiOpts);

        server.route({
            method: 'GET',
            path: '/healthcheck',
            config: {
                auth: false
            },
            handler: function(request, reply) {
                reply('OK').type('text/plain');
            }
        });

        server.ext('onPreResponse', function(request, reply) {
            var response = request.response;

            if (response.isBoom && response.output.status === 500) {
                if (settings.errorPage) {
                    return reply.file(settings.errorPage);
                } else {
                    return reply('<h1>An Unexpected Error Occurred.</h1>').type('text/html');
                }
            }

            return reply();
        });

        server.on('log', function(evt, tags) {
            var level = getLogLevel(tags);

            log[level](evt.data);
        });

        server.on('request', function(request, evt, tags) {
            var level = getLogLevel(tags);

            if (evt.data) log[level](evt.data);
        });

        server.on('internalError', function(request, err) {
            log.error({ url: request.url.href,  error: err });
        });

        server.run = function() {
            if (cluster.isMaster && serverOpts.workers > 1) {
                for (var i = 1; i <= serverOpts.workers; i++) {
                    log.info('Starting worker #' + i);
                    cluster.fork();
                }
            } else {
                server.start(function() {
                    log.info('Running in ' + settings.environment + ' mode.');
                    log.info('Server running on: http://localhost:' + port);
                });
            }
        };

        return server;
    }
};

var logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function getLogLevel(tags) {
    return _reduce(logLevels, function(accum, level) {
        if (tags[level]) { accum = level; }
        return accum;
    }, 'debug');
}