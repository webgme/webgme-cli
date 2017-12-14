/*globals describe,it,before,beforeEach*/
// Testing the command line interfaces for the commands
'use strict';

var spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    R = require('ramda'),
    assert = require('assert'),
    utils = require(__dirname + '/res/utils'),
    binPath = path.join(__dirname, '..', 'bin', 'webgme'),
    TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    cliCalls = ['init', 'info', 'start', 'new', 'import', 'rm', 'ls', 'enable', 'disable', 'mount', 'new router', 'rm router', 'ls router', 'new layout', 'import layout', 'rm layout', 'ls layout', 'enable layout', 'disable layout', 'new decorator', 'import decorator', 'rm decorator', 'ls decorator', 'enable decorator', 'disable decorator', 'new addon', 'import addon', 'rm addon', 'ls addon', 'enable addon', 'disable addon', 'new plugin', 'import plugin', 'rm plugin', 'ls plugin', 'new viz', 'import viz', 'rm viz', 'ls viz', 'enable viz', 'disable viz', 'new seed', 'import seed', 'rm seed', 'ls seed'].map(function (args) {
    return args + ' --help';
});

var testCliCall = function testCliCall(args, test, done) {
    var webgmeBin,
        response = '',
        error = '';

    webgmeBin = spawn(binPath, args);

    webgmeBin.stdout.on('data', function (data) {
        response += data.toString();
    });

    webgmeBin.stderr.on('data', function (data) {
        error += data.toString();
    });

    webgmeBin.on('exit', function (code) {
        assert.equal(code, 0, error);
        assert.notEqual(response.length, 0);
        if (test) {
            test(response, error, done);
        } else {
            done();
        }
    });
};

describe('cli', function () {

    before(function () {
        process.chdir(__dirname);
    });

    // Checking that they all print help message
    it('should run "webgme --help"', testCliCall.bind(this, ['--help'], null));

    for (var i = cliCalls.length; i--;) {
        it('should run "webgme ' + cliCalls[i] + '"', testCliCall.bind(this, cliCalls[i].split(' '), null));
    }

    // Checking that 'webgme ls' lists all components
    describe('ls', function () {
        var lsProject = path.join(TMP_DIR, 'BaseLsProj');
        before(function (done) {
            utils.getCleanProject(lsProject, done);
        });

        it('should print all installed/dependent components', function (done) {
            var testFn = function testFn(res, err, done) {
                var contents = ['plugin', 'seed'];
                assert.equal(res.indexOf('Usage'), -1);
                contents.forEach(R.pipe(res.indexOf.bind(res), assert.notEqual.bind(assert, -1)));
                done();
            };
            testCliCall(['ls'], testFn, done);
        });
    });

    describe('invalid component', function () {
        it('should print all installed/dependent components', function (done) {
            var testFn = function testFn(res, err, done) {
                assert.notEqual(res.indexOf('Usage'), -1);
                done();
            };
            testCliCall(['new', 'pasdfl'], testFn, done);
        });
    });

    describe('invalid action', function () {
        it('should print all accepted actions', function (done) {
            var testFn = function testFn(res, err, done) {
                assert.notEqual(res.indexOf('Usage'), -1);
                done();
            };
            testCliCall(['pasdfl'], testFn, done);
        });
    });

    describe('--package-name option on import', function () {
        var binDir = path.join(__dirname, '..', 'bin'),
            files = fs.readdirSync(binDir),
            testFn = function testFn(response, err, end) {
            assert.notEqual(response.indexOf('--package-name'), -1, response);
            end();
        };

        files.map(function (name) {
            return name.split('-');
        }).filter(function (cmds) {
            return cmds.length === 3 && cmds[1] === 'import';
        }).forEach(function (cmds) {
            cmds.shift();
            it('should have --package-name for ' + cmds[1], testCliCall.bind(null, cmds, testFn));
        });
    });
});