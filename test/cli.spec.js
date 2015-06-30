var cli = require('../src/cli');
var sinon = require('sinon');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
var sinonChai = require('sinon-chai');
var _ = require('lodash');
var rm_rf = require('rimraf');

var emitter;

var callWebGME = function(args) {
    return cli.argv(_.extend({_: ['node', 'cli.js']}, args));
};

describe('WebGME-cli', function() {
    'use strict';

    before(function() {
        emitter = cli.emitter;
        // sinon.spy(emitter, 'on');
    });

    describe('basic flags', function() {

        describe('help', function() {
            var helpMsg;
            before(function(done) {
                fs.readFile(__dirname+'/../doc/help.txt', 'utf-8', function(e, txt) {
                    helpMsg = txt;
                    done();
                });
            });

            it('should log to console when given --help', function(done) {
                emitter.once('write', function(msg) { 
                    done();
                });
                callWebGME({help: true});
            });

            it('should display help message when given --help', function(done) {
                emitter.once('write', function(msg) { 
                    assert.equal(helpMsg, msg);
                    done();
                });
                callWebGME({help: true});
            });

            it('should display help message when given --h', function(done) {
                emitter.once('write', function(msg) { 
                    assert.equal(helpMsg, msg);
                    done();
                });
                callWebGME({help: true});
            });

        });

        describe('version', function() {
            var version;
            before(function() {
                version = require('../package.json').version;
            });

            it('should display correct version', function(done) {
                emitter.once('write', function(msg) { 
                    assert.equal('v'+version, msg);
                    done();
                });
                callWebGME({version: true});
            });
        });

    });

    describe('verbose', function() {
        // TODO
    });

    // Creating a new item from boilerplate
    describe('basic commands', function() {
        var TMP_DIR = 'test-tmp';
        before(function(done) {
            // Create tmp directory in project root
            TMP_DIR = path.join(__dirname, '..', TMP_DIR);
            fs.mkdir(TMP_DIR, done);
        });

        describe('init', function() {
            var PROJECT_DIR;
            beforeEach(function() {
                PROJECT_DIR = path.join(TMP_DIR, 'ExampleProject');
            });

            it('should create a new directory with project name', function() {
                callWebGME({_: ['node', 'cli.js', 'init', PROJECT_DIR]});
                assert(fs.existsSync(PROJECT_DIR));
            });

            it('should initialize an npm project', function() {
                callWebGME({_: ['node', 'cli.js', 'init', PROJECT_DIR]});
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                assert(fs.existsSync(packageJSON));
            });

            it('should name the npm project appropriately', function() {
                callWebGME({_: ['node', 'cli.js', 'init', PROJECT_DIR]});
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                var pkg = require(packageJSON);
                assert.equal(pkg.name, 'ExampleProject'.toLowerCase());
            });

            it('should add the webgme as a dependency', function() {
                callWebGME({_: ['node', 'cli.js', 'init', PROJECT_DIR]});
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                var deps = require(packageJSON).dependencies;
                assert(deps.hasOwnProperty('webgme'));
            });

            it.skip('should use the latest release of webgme', function() {
            });

            it('should throw error if no project name', function(done) {
                emitter.once('error', function(msg) { 
                    done();
                });
                callWebGME({_: ['node', 'cli.js', 'init']});
            });

            afterEach(function(done) {
                if (fs.existsSync(PROJECT_DIR)) {
                    rm_rf(PROJECT_DIR, done);
                } else {
                    done();
                }
            });

        });

        after(function(done) {
            rm_rf(TMP_DIR, done);
        });
    });

    // Share an item used in the project
    describe('share', function() {
        it.skip('should fail if sharing invalid type', function() {
        });

        it.skip('should fail if sharing invalid name', function() {
        });

        it.skip('should record the name, type info in manifest', function() {
        });

    });

    // Importing an existing item into the project
    describe('add', function() {
        it.skip('should add ', function() {
        });
    });

    describe('update', function() {
    });

    describe('rm', function() {
    });
});
