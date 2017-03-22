'use strict';

const Promise = require('bluebird');
const promiseRetry = require('promise-retry');

exports.enhance = function (connection) {
    connection.with = function (callback, options) {
        const opt = options || {};
        setRetryDefaults(opt);

        if (opt.retry) {
            return promiseRetry(retry => {
                return connection.with(callback)
                    .catch(err => {
                        console.error('Error during AMQP operation, will retry', err);
                        return retry();
                    });
            }, opt);
        } else {
            return Promise.using(connection.createChannel(), callback);
        }
    };

    function consume(queue, onMessage, options) {
        return connection.with(ch => {
            return new Promise((_accept, reject) => {
                ch.on('error', err => reject(err));
                ch.on('close', () => reject('Channel closed'));

                if (options.prefetch) {
                    ch.prefetch(options.prefetch);
                }

                ch.consume(queue, msg => {
                    if (msg === null) {
                        reject('Broker canceled consumer')
                    } else {
                        Promise.resolve()
                            .then(() => {
                                let message = msg;
                                if (options.json) {
                                    try {
                                        message = JSON.parse(msg.content.toString());
                                    } catch (err) {
                                        return Promise.reject(err);
                                    }
                                }
                                return onMessage(message);
                            })
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
    }

    function consumeLoop(queue, onMessage, options) {
        const opt = options || {};
        setRetryDefaults(opt);

        return promiseRetry(retry => {
            return consume(queue, onMessage, options).catch(err => {
                console.error('Error while consuming messages, will retry', err);
                return retry();
            });
        }, opt);
    }

    connection.consume = function (queue, onMessage, options) {
        const opt = options || {};

        if (opt.retry) {
            return consumeLoop(queue, onMessage, opt);
        } else {
            return consume(queue, onMessage, opt);
        }
    };

    function setRetryDefaults(opt) {
        opt.forever = opt.forever === undefined ? true : opt.forever;
        opt.maxTimeout = opt.maxTimeout === undefined ? 20000 : opt.maxTimeout;
    }

    return connection;
};
