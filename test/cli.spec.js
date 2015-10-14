/*globals describe,it,before,beforeEach*/
// Testing the command line interfaces for the commands
'use strict';

var spawn = require('child_process').spawn,
    path = require('path'),
    R = require('ramda'),
    assert = require('assert'),
    utils = require(__dirname+'/res/utils'),
    binPath = path.join(__dirname, '..', 'bin', 'webgme'),
    TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    cliCalls = [
        'new',
        'add',
        'rm',
        'ls',
        'enable',
        'disable',

        'new decorator',
        'add decorator',
        'rm decorator',
        'ls decorator',
        'enable decorator',
        'disable decorator',

        'new plugin',
        'add plugin',
        'rm plugin',
        'ls plugin',
        'enable plugin',
        'disable plugin',

        'new viz',
        'add viz',
        'rm viz',
        'ls viz',
        'enable viz',
        'disable viz',

        'new seed',
        'add seed',
        'rm seed',
        'ls seed'
    ].map(function(args) {
        return args+' --help';
    });

var testCliCall = function(args, test, done) {
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
        if (test) {
            test(response, error, done);
        } else {
            done();
        }
    });
};

describe('cli', function() {
    'use strict';

    before(function() {
        process.chdir(__dirname);
    });

    // Checking that they all print help message
    it('should run "webgme --help"', testCliCall.bind(this, ['--help'], null));

    for (var i = cliCalls.length; i--;) {
        it('should run "webgme ' + cliCalls[i] + '"', 
            testCliCall.bind(this, cliCalls[i].split(' '), null));
    }

    // Checking that 'webgme ls' lists all components
    describe('ls', function() {
        var lsProject = path.join(TMP_DIR, 'BaseLsProj');
        before(function(done) {
            utils.getCleanProject(lsProject, done);
        });

        it('should print all installed/dependent components', function(done) {
            var testFn = function(res, err, done) {
                var contents = ['plugin', 'seed'];
                assert.equal(res.indexOf('Usage'), -1);
                contents.forEach(R.pipe(
                    res.indexOf.bind(res),
                    assert.notEqual.bind(assert, -1)
                ));
                done();
            };
            testCliCall(['ls'], testFn, done);
        });
    });
});
