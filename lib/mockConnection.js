'use strict';

const storymock = require('storymock');
const connections = require('./connections');
const EventEmitter = require('events').EventEmitter;

exports.newConnection = newConnection;

function newConnection() {
    const mock = storymock()
        .asyncEvent('createChannel')
        .asyncEvent('assertQueue', storymock.equalsMatcher)
        .asyncEvent('checkQueue', storymock.equalsMatcher)
        .asyncEvent('bindQueue', storymock.equalsMatcher)
        .asyncEvent('assertExchange', storymock.equalsMatcher)
        .asyncEvent('checkExchange', storymock.equalsMatcher)
        .asyncEvent('purgeQueue', storymock.equalsMatcher)
        .asyncEvent('publish', storymock.equalsMatcher)
        .asyncEvent('consume', storymock.equalsMatcher)
        .event('ack', storymock.equalsMatcher)
        .event('nack', storymock.equalsMatcher)
        .asyncEvent('close');

    return mock.configure(connections.enhance({
        createChannel() {
            return mock.outcomeOf('createChannel')
                .then(() => {
                    const result = {
                        assertQueue: queue => mock.outcomeOf('assertQueue', queue),
                        checkQueue: queue => mock.outcomeOf('checkQueue', queue),
                        bindQueue: (queue, exchange) => mock.outcomeOf('bindQueue', [queue, exchange]),
                        assertExchange: exchange => mock.outcomeOf('assertExchange', exchange),
                        checkExchange: exchange => mock.outcomeOf('checkExchange', exchange),
                        purgeQueue: queue => mock.outcomeOf('purgeQueue', queue),
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
                        nack: msg => mock.outcomeOf('nack', msg),
                        close: () => mock.outcomeOf('close')
                    };

                    result.__proto__ = EventEmitter.prototype;

                    return result;
                })
                .disposer(() => mock.outcomeOf('close'))
        }
    }));
}