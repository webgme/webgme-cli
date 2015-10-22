/*globals describe,it,before*/

var Readable = require('stream').Readable,
    Logger = require('../lib/Logger'),
    assert = require('assert'),
    logger = new Logger(),
    emitter = logger._emitter;

describe('Logger tests', function() {
    'use strict';
    it('should print streams to stdout', function(done) {
        var stream = new Readable(),
            printedText = '';
        stream._read = function(){};

        emitter.on('silly', function(data) {
            printedText += data.toString();
        });
        logger.sillyStream(stream);
        stream.push('hello world\n');
        stream.push('hello world');
        stream.push(null);
        // Check that we received it all
        setTimeout(function() {
            assert.equal(printedText.split('hello world').length,3);
            done()
        }, 80);
    });
});

