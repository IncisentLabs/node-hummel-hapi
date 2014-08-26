# Hummel Hapi.js Integration

Allows a Hapi Server to be started and configured using hummel logging, settings,
and standard configuration parameters.

All log events are intecepted and mapped to the corresponding bunyan log method by tag. (Defaults to debug)

The Hapi debug console logging is disable and piped through bunyan instead.

## Install

    npm install hummel-hapi --save

## Usage

    var server = require('hummel-hapi').createServer();

    server.route({
        method: 'GET',
        path: '/',
        handler: function(request, reply) {
            reply('Hello World!');
        }
    });

    server.run();
