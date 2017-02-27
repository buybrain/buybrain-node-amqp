'use strict';

/**
 * Wrapper around amqplib that reconnects whenever a connection errors. It basically is a more reliable factory for
 * AMQP channels.
 */

const Promise = require('bluebird');
const amqp = require('amqplib');
const connections = require('./connections');

const RETRY_INTERVAL_SEC = 5;

exports.newConnection = newConnection;

function newConnection(options) {
    let conn = null;
    let connErr = null;
    let onConn = [];

    function connect() {
        amqp.connect(options).then(newConn => {
            conn = newConn;
            connErr = null;
            conn.on('error', handleConnErr);
            triggerOnConn();
        }).catch(handleConnErr)
    }

    function handleConnErr(err) {
        console.error('AMQP connection error. Will retry in ' + RETRY_INTERVAL_SEC + ' seconds', err);
        conn = null;
        connErr = err;
        triggerOnConn();
        setTimeout(connect, RETRY_INTERVAL_SEC * 1000);
    }

    function triggerOnConn() {
        onConn.forEach(callback => {
            callback(connErr, conn);
        });
        onConn = [];
    }

    connect();

    /**
     * Promise a new AMQP connection. If a connection already exists, that one is immediately returned. If the last
     * connection attempt failed, or the last connection raised an error, the promise will be rejected with that error.
     * In that case, a new connection will be established in the background and after some time will be available.
     * Finally, if this is the first request, the promise will wait for the result of the first connection attempt and
     * either accept or reject depending on the result.
     */
    function promiseConn() {
        if (conn == null) {
            if (connErr === null) {
                return new Promise((accept, reject) => {
                    onConn.push((err, conn) => {
                        if (err) {
                            return reject(err);
                        }
                        return accept(conn);
                    });
                })
            } else {
                return Promise.reject(connErr);
            }
        } else {
            return Promise.resolve(conn);
        }
    }

    return connections.enhance({
        createChannel() {
            let done = () => {
            };
            return promiseConn()
                .then(conn => conn.createChannel())
                .then(chan => {
                    // Ignore errors on the channel. When a channel is broken, operations on it will fail too and the
                    // client can obtain a new channel.
                    chan.on('error', () => {
                    });
                    done = () => chan.close().catch(err => {});
                    return chan;
                })
                .disposer(() => done());
        }
    })
}
