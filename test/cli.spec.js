/*globals describe,it,before,beforeEach*/
// Testing the command line interfaces for the commands
'use strict';

const {version} = require('../package.json');
var spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    utils = require(__dirname+'/res/utils'),
    binPath = path.join(__dirname, '..', 'bin', 'webgme'),
    TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    cliCalls = [
        'init',
        'info',
        'start',

        'new',
        'import',
        'rm',
        'ls',
        'enable',
        'disable',

        'mount',
        'new router',
        'rm router',
        'ls router',

        'new layout',
        'import layout',
        'rm layout',
        'ls layout',
        'enable layout',
        'disable layout',

        'new decorator',
        'import decorator',
        'rm decorator',
        'ls decorator',
        'enable decorator',
        'disable decorator',

        'new addon',
        'import addon',
        'rm addon',
        'ls addon',
        'enable addon',
        'disable addon',

        'new plugin',
        'import plugin',
        'rm plugin',
        'ls plugin',

        'new viz',
        'import viz',
        'rm viz',
        'ls viz',
        'enable viz',
        'disable viz',

        'new seed',
        'import seed',
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
        if (test) {
            test(response, error, done);
        } else {
            assert.equal(code, 0, error);
            assert.notEqual(response.length, 0);
            done();
        }
    });
};

describe('cli', function() {

    before(function() {
        process.chdir(__dirname);
    });

    // Checking that they all print help message
    it('should run "webgme --help"', testCliCall.bind(this, ['--help'], null));

    for (var i = cliCalls.length; i--;) {
        it('should run "webgme ' + cliCalls[i] + '"', 
            testCliCall.bind(this, cliCalls[i].split(' '), null));
    }

    describe('start', function() {
        var startProj = path.join(TMP_DIR, 'BaseStartProj');
        before(function(done) {
            utils.getCleanProject(startProj, done);
        });

        it('should throw error if deps cannot be installed', function(done) {
            let pkgJsonPath = path.join(startProj, 'package.json');
            let pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
            let badPkgName = 'asdfffffffffff';

            this.timeout(5000);

            // Add a garbage dependency to the package.json
            pkgJson.dependencies[badPkgName] = '=0.1.3';
            fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

            // Make sure that there are some logs about the error
            let testFn = (res, stderr, done) => {
                const notFoundRegex = /(404|Not found)/;
                assert(notFoundRegex.test(stderr), `Did not print 404/Not found in "${res}"`);
                assert(stderr.includes(badPkgName));
                done();
            };
            testCliCall(['start'], testFn, done);
        });
    });

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
                contents.forEach(content => assert(res.includes(content)));
                done();
            };
            testCliCall(['ls'], testFn, done);
        });
    });

    describe('invalid component', function() {
        it('should print all installed/dependent components', function(done) {
            var testFn = function(res, err, done) {
                assert.notEqual(res.indexOf('Usage'), -1);
                done();
            };
            testCliCall(['new', 'pasdfl'], testFn, done);
        });
    });

    describe('invalid action', function() {
        it('should print all accepted actions', function(done) {
            var testFn = function(res, err, done) {
                assert.notEqual(res.indexOf('Usage'), -1);
                done();
            };
            testCliCall(['pasdfl'], testFn, done);
        });
    });

    describe('invalid option', function() {
        it('should print error message', function(done) {
            var testFn = function(res, err, done) {
                assert.notEqual(res.indexOf('Invalid value'), -1);
                done();
            };
            testCliCall(['new', 'plugin', 'testName', '--language', 'daf'], testFn, done);
        });
    });

    describe('version info', function() {
        it('should show version on --version', done => {
            var testFn = function(res, err, done) {
                assert(res.includes(version));
                done();
            };
            testCliCall(['--version'], testFn, done);
        });

        it('should show version on -V', done => {
            var testFn = function(res, err, done) {
                assert(res.includes(version));
                done();
            };
            testCliCall(['--version'], testFn, done);
        });
    });

    describe('--package-name option on import', function() {
        var binDir = path.join(__dirname, '..', 'bin'),
            files = fs.readdirSync(binDir),
            testFn = function(response, err, end) {
                assert.notEqual(response.indexOf('--package-name'), -1, response);
                end();
            };
        
        files
            .map(name => name.split('-'))
            .filter(cmds => cmds.length === 3 && cmds[1] === 'import')
            .forEach(cmds => {
                cmds.shift();
                it(`should have --package-name for ${cmds[1]}`,
                    testCliCall.bind(null, cmds, testFn));
            });
    });
});
