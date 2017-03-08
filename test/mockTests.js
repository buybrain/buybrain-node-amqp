'use strict';

const amqp = require('../lib/amqp');

exports.testPubSub = function (t) {
    t.expect(1);

    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('assertQueue', 'testing')
        .expect('purgeQueue', 'testing')
        .expect('checkQueue', 'testing')
        .expect('assertExchange', 'ex')
        .expect('checkExchange', 'ex')
        .expect('publish', ['', 'testing', new Buffer('test')])
        .expect('consume', 'testing').ok([{content: new Buffer('test')}])
        .expect('ack', {content: new Buffer('test')})
        .expect('close');

    amqp.using(SUT.createChannel(), ch => {
        return ch.assertQueue('testing')
            .then(() => ch.purgeQueue('testing'))
            .then(() => ch.checkQueue('testing'))
            .then(() => ch.assertExchange('ex'))
            .then(() => ch.checkExchange('ex'))
            .then(() => ch.publish('', 'testing', new Buffer('test')))
            .then(() => new Promise(accept => {
                ch.consume('testing', accept);
            }))
            .then(msg => {
                ch.ack(msg);
                return msg.content.toString();
            })
            .catch(console.error);
    }).then(message => {
        t.equal('test', message);
        t.done();
    });
};

exports.testWith = function (t) {
    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('publish', ['', 'testing', new Buffer('test')])
        .expect('close');

    SUT.with(ch => ch.publish('', 'testing', new Buffer('test')))
        .then( t.done);
};

exports.testWithRetry = function (t) {
    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('publish', ['', 'testing', new Buffer('test')]).fail(new Error('Nope'))
        .expect('close')
        .expect('createChannel')
        .expect('publish', ['', 'testing', new Buffer('test')])
        .expect('close');

    SUT.with(ch => ch.publish('', 'testing', new Buffer('test')), {retry: true, minTimeout: 10})
        .then( t.done);
};

exports.testConnectionConsume = function (t) {
    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('consume', 'testing').ok([{content: new Buffer('test')}])
        .expect('ack')
        .expect('close');

    SUT.consume('testing', msg => {
        t.equal('test', msg.content.toString());
        t.done();
    });
};

exports.testJsonConsume = function (t) {
    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('consume', 'testing').ok([{content: new Buffer('{"a":123}')}])
        .expect('ack')
        .expect('close');

    SUT.consume('testing', msg => {
        t.deepEqual({a: 123}, msg);
        t.done();
    }, {json: true});
};

exports.testConsumeRetry = function (t) {
    const SUT = amqp.newMockConnection()
        .expect('createChannel')
        .expect('consume', 'testing').ok([null])
        .expect('close')
        .expect('createChannel')
        .expect('consume', 'testing').ok([{content: new Buffer('{"a":123}')}])
        .expect('ack')
        .expect('close');

    SUT.consume('testing', msg => {
        t.deepEqual({a: 123}, msg);
        t.done();
    }, {json: true, retry: true, minTimeout: 10});
};