'use strict';

const Promise = require('bluebird');

exports.enhance = function(connection) {
    connection.with = function(callback) {
        return Promise.using(connection.createChannel(), callback);
    };

    connection.consume = function(queue, handler) {
        return connection.with(ch => {
            return new Promise((_accept, reject) => {
                ch.on('error', err => reject(err));
                ch.on('close', () => reject('Channel closed'));
                ch.consume(queue, msg => {
                    if (msg === null) {
                        reject('Broker canceled consumer')
                    } else {
                        Promise.resolve()
                            .then(() => handler(msg))
                            .then(() => ch.ack(msg))
                            .catch(err => {
                                console.error('Error while consuming message', err);
                                console.error('Message was:', msg.content.toString());
                                return ch.nack(msg, false, false);
                            });
                    }
                }).catch(reject);
            });
        });
    };

    return connection;
};