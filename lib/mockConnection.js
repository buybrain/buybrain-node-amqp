'use strict';

const storymock = require('storymock');

exports.newConnection = newConnection;

function newConnection() {
    const mock = storymock()
        .asyncEvent('createChannel')
        .asyncEvent('assert', storymock.equalsMatcher)
        .asyncEvent('purge', storymock.equalsMatcher)
        .asyncEvent('publish', storymock.equalsMatcher)
        .asyncEvent('consume', storymock.equalsMatcher)
        .event('ack', storymock.equalsMatcher)
        .asyncEvent('close');

    return mock.configure({
        createChannel() {
            return mock.outcomeOf('createChannel')
                .then(() => {
                    return {
                        assertQueue: queue => mock.outcomeOf('assert', queue),
                        purgeQueue: queue => mock.outcomeOf('purge', queue),
                        publish: (exchange, routingKey, data) => {
                            return mock.outcomeOf('publish', [exchange, routingKey, data])
                        },
                        consume: (queue, onMessage) => {
                            return mock.outcomeOf('consume', queue)
                                .then(messages => {
                                    messages.forEach(onMessage);
                                })
                        },
                        ack: msg => mock.outcomeOf('ack', msg),
                        close: () => mock.outcomeOf('close')
                    };
                })
                .disposer(() => mock.outcomeOf('close'))
        }
    });
}