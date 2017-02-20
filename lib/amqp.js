'use strict';

const Promise = require('bluebird');

const real = require('./realConnection');
const mock = require('./mockConnection');

exports.newConnection = real.newConnection;
exports.newMockConnection = mock.newConnection;

exports.using = Promise.using;