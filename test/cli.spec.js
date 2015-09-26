/*globals describe,it,before,beforeEach*/
// Testing the command line interfaces for the commands
var spawn = require('child_process').spawn,
    path = require('path'),
    assert = require('assert'),
    binPath = path.join(__dirname, '..', 'bin', 'webgme'),
    cliCalls = [
        'new',
        'add',
        'rm',
        'ls',
        'enable',
        'disable',

        'new plugin',
        'add plugin',
        'rm plugin',
        'ls plugin',
        'enable plugin',
        'disable plugin',

        'new seed',
        'add seed',
        'rm seed',
        'ls seed'
    ].map(function(args) {
        return args+' --help';
    });

var testCliCall = function(args, done) {
    var webgmeBin,
        response = '',
        error = '';

    webgmeBin = spawn(binPath, args);

    webgmeBin.stdout.on('data', function(data) {
        response += data.toString();
    });

    webgmeBin.stderr.on('data', function(data) {
        error += data.toString();
    });

    webgmeBin.on('exit', function(code) {
        assert.equal(code, 0, error);
        assert.notEqual(response.length, 0);
        done();
    });
};

describe('cli', function() {
    'use strict';

    before(function() {
        process.chdir(__dirname);
    });

    it('should run "webgme --help"', testCliCall.bind(this, ['--help']));

    for (var i = cliCalls.length; i--;) {
        it('should run "webgme ' + cliCalls[i] + '"', 
            testCliCall.bind(this, cliCalls[i].split(' ')));
    }
});
