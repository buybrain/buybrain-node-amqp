'use strict';

/**
 * For these tests a running RabbitMQ instance is required. An easy way to get it up and running is by using docker.
 *
 * docker run --rm -p 5673:5672 -p 15673:15672 rabbitmq:3-management
 */

const amqp = require('../lib/amqp');

const SUT = amqp.newConnection({
    user: 'guest',
    password: 'guest',
    host: 'localhost',
    port: 5673,
    vhost: '/'
});

exports.testPubSub = function (t) {
    t.expect(1);

    amqp.using(SUT.createChannel(), ch => {
        return ch.assertQueue('testing')
            .then(() => ch.purgeQueue('testing'))
            .then(() => ch.publish('', 'testing', new Buffer('test')))
            .then(() => new Promise(accept => {
                ch.consume('testing', accept);
            }))
            .then(msg => {
                ch.ack(msg);
                return msg.content.toString();
            });
    }).then(message => {
        t.equal('test', message);
        t.done();
    });
};