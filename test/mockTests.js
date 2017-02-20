'use strict';

const amqp = require('../lib/amqp');

exports.testPubSub = function (t) {
    t.expect(1);

    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('assert', 'testing')
        .expect('purge', 'testing')
        .expect('publish', ['', 'testing', new Buffer('test')])
        .expect('consume', 'testing').ok([{content: new Buffer('test')}])
        .expect('ack', {content: new Buffer('test')})
        .expect('close');

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