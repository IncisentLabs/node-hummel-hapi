

var pmx = require('pmx').init({
    http          : true, // HTTP routes logging (default: false)
    http_latency  : 200,  // Limit of acceptable latency
    http_code     : 500,  // Error code to track'
    alert_enabled : true,  // Enable alerts (If you add alert subfield in custom it's going to be enabled)
    ignore_routes : [/socket\.io/, /notFound/], // Ignore http routes with this pattern (default: [])
    errors        : true, // Exceptions loggin (default: true)
    custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics (default: true)
    network       : true, // Network monitoring at the application level (default: false)
    ports         : true  // Shows which ports your app is listening on (default: false)
});

pmx.http();

var cluster = require('cluster'),
    Hapi = require('hapi'),
    hummel = require('hummel'),
    settings = hummel.getSettings(),
    log = hummel.getLogger(),
    _reduce = require('lodash-node/modern/collections/reduce'),
    _defaults = require('lodash-node/modern/objects/defaults'),
    _pick = require('lodash-node/modern/objects/pick'),
    pmx = require('pmx');

var ValidHapiOpts = [ 'port', 'app', 'cache', 'debug', 'load', 'mime', 'plugins', 'useDomains'];

module.exports = {

    createServer: function(opts) {
        opts = opts || {};

        serverOpts = hummel.getOptions(opts);
        hapiOpts = _defaults(_pick(opts, ValidHapiOpts), { debug: { request: false } });
        var server = new Hapi.Server();
        server.connection({ port: hapiOpts.port });

        server.route({
            method: 'GET',
            path: '/healthcheck',
            config: {
                auth: false
            },
            handler: function(request, reply) {
                return reply('OK').type('text/plain');
            }
        });

        server.ext('onPreResponse', function(request, reply) {
            var response = request.response;

            if (response.isBoom)
            {
                log.info({ url: request.url.href },  response.output.payload.statusCode);
                if (response.output.status === 500) {
                    if (settings.errorPage) {
                        return reply.file(settings.errorPage);
                    } else {
                        return reply('<h1>An Unexpected Error Occurred.</h1>').type('text/html');
                    }
                }
            }
            else
            {
                log.info({ url: request.url.href });
            }

            return reply.continue();
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
                    log.info('Server running on: http://localhost:' + server.connections[0].info.port);
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
