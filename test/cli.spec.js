/*globals describe,it,before,after*/
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
var WebGMEConfig = 'config.webgme.js';

var callWebGME = function(args, callback) {
    'use strict';
    cli.argv(_.extend({_: ['node', 'cli.js']}, args));
    if (callback) {
        setTimeout(callback, 100);
    }
};

describe('WebGME-cli', function() {
    'use strict';

    before(function() {
        emitter = cli.emitter;
        // sinon.spy(emitter, 'on');
    });

    describe('basic flags', function() {

        describe('help', function() {
            var helpMsg, newHelpSnippet;
            before(function(done) {
                fs.readFile(__dirname+'/../doc/help.txt', 'utf-8', function(e, txt) {
                    helpMsg = txt.split('\n')[0];
                    // Load the help msg for new plugins
                    fs.readFile(__dirname+'/../doc/plugin/help.new.txt', 'utf-8', function(e, txt) {
                        newHelpSnippet = txt.split('\n')[0];
                        done();
                    });
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
                    assert.notEqual(msg.indexOf(helpMsg), -1);
                    done();
                });
                callWebGME({help: true});
            });

            it('should display help message for "new plugin"', function(done) {
                emitter.once('write', function(msg) { 
                    // Since the new help message is a template, I am just checking the usage line
                    assert.notEqual(msg.indexOf(newHelpSnippet), -1);
                    done();
                });
                callWebGME({_: ['node', 'webgme', 'new', 'plugin'], help: true});
            });

            it('should display help options for "new plugin"', function(done) {
                emitter.once('write', function(msg) { 
                    // Since the new help message is a template, I am just checking the usage line
                    assert.notEqual(msg.indexOf("plugin-name"), -1);
                    done();
                });
                callWebGME({_: ['node', 'webgme', 'new', 'plugin'], help: true});
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
        var TMP_DIR = path.join(__dirname, '..', 'test-tmp');
        var PROJECT_DIR = path.join(TMP_DIR, 'ExampleProject');
        before(function(done) {
            // Create tmp directory in project root
            if (!fs.existsSync(TMP_DIR)) {
                fs.mkdir(TMP_DIR, done);
            } else {
                rm_rf(TMP_DIR, function() {
                    fs.mkdir(TMP_DIR, done);
                });
            }
        });

        describe('init', function() {

            before(function(done) {
                callWebGME({_: ['node', 'cli.js', 'init', PROJECT_DIR]}, done);
            });

            it('should create a new directory with project name', function() {
                assert(fs.existsSync(PROJECT_DIR));
            });

            it('should create a .webgme file in project root', function() {
                assert(fs.existsSync(path.join(PROJECT_DIR, '.webgme.json')));
            });

            it('should initialize an npm project', function() {
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                assert(fs.existsSync(packageJSON));
            });

            it('should name the npm project appropriately', function() {
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                var pkg = require(packageJSON);
                assert.equal(pkg.name, 'ExampleProject'.toLowerCase());
            });

            it('should add the webgme as a dependency', function() {
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                var deps = require(packageJSON).dependencies;
                assert(deps.hasOwnProperty('webgme'));
            });

            it.skip('should use the latest release of webgme', function() {
            });

            it('should create a webgme config file', function() {
                var config = path.join(PROJECT_DIR, WebGMEConfig);
                assert(fs.existsSync(config));
            });

            it('should create editable (boilerplate) webgme config file', function() {
                var config = path.join(PROJECT_DIR, 'config.js');
                assert(fs.existsSync(config));
            });

            it('should create webgme app.js file', function() {
                var app = path.join(PROJECT_DIR, 'app.js');
                assert(fs.existsSync(app));
            });

            it('should throw error if no project name', function(done) {
                emitter.once('error', function(msg) { 
                    done();
                });
                callWebGME({_: ['node', 'cli.js', 'init']});
            });

            describe('Plugin tests', function() {
                var PLUGIN_NAME = 'MyNewPlugin',
                    PluginBasePath = path.join(PROJECT_DIR, 'src', 'plugins'),
                    PLUGIN_SRC = path.join(PluginBasePath, PLUGIN_NAME, PLUGIN_NAME+'.js'),
                    PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugins', PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

                describe('new plugin', function() {
                    before(function(done) {
                        process.chdir(PROJECT_DIR);
                        callWebGME({
                            _: ['node', 'webgme', 'new', 'plugin', PLUGIN_NAME]
                        }, done);
                    });

                    it('should create the plugin source file', function() {
                        assert(fs.existsSync(PLUGIN_SRC));
                    });

                    it('should create the plugin\'s test file', function() {
                        assert(fs.existsSync(PLUGIN_TEST));
                    });

                    it('should add the plugin (relative) path to the config file', function() {
                        var config = require(path.join(PROJECT_DIR, 'config.webgme.js'));
                        // check that basePath has been added!
                        var relativeBase = PluginBasePath.replace(PROJECT_DIR+path.sep, '');
                        assert.notEqual(config.plugin.basePaths.indexOf(relativeBase), -1);
                    });

                    it('should record the plugin in .webgme file', function() {
                        var config = require(path.join(PROJECT_DIR,'.webgme.json'));
                        assert.notEqual(config.components.plugins[PLUGIN_NAME], undefined);
                    });
                });

                describe('rm plugin', function() {
                    var PLUGIN_NAME = 'RemoveMe';
                    before(function(done) {
                        process.chdir(PROJECT_DIR);
                        callWebGME({
                            _: ['node', 'webgme', 'new', 'plugin', PLUGIN_NAME]
                        }, function() {
                            callWebGME({
                                _: ['node', 'webgme', 'rm', 'plugin', PLUGIN_NAME]
                            }, done);
                        });
                    });

                    it('should remove plugin src directory', function() {
                        var pluginPath = path.join(PROJECT_DIR, 'src', 'plugins', PLUGIN_NAME);
                        assert.equal(fs.existsSync(pluginPath), false);
                    });

                    it('should remove plugin test directory', function() {
                        var pluginPath = path.join(PROJECT_DIR, 'test', 'plugins', PLUGIN_NAME);
                        assert.equal(fs.existsSync(pluginPath), false);
                    });

                    it('should remove plugin entry from webgme.json', function() {
                        var config = require(path.join(PROJECT_DIR,'.webgme.json'));
                        assert.equal(config.components[PLUGIN_NAME], undefined);
                    });
                });

                describe('add plugin', function() {
                    // FIXME: Change this to an actual repo on github
                    // so it can pass
                    var OTHER_PROJECT = 'brollb/VisualConstraintLanguage';
                    var OTHER_PLUGIN = 'BlockEditor';
                    before(function(done) {
                        process.chdir(PROJECT_DIR);
                        callWebGME({
                            _: ['node', 'webgme', 'add', 'plugin', OTHER_PROJECT, OTHER_PLUGIN]
                            }, done);
                    });

                    it.skip('should add the project to the package.json', function() {
                        // FIXME: This fails only when run with all the other tests
                        var pkg = require(path.join(PROJECT_DIR, 'package.json'));
                        // For some stupid reason, pkg was an object when
                        // all tests were running but a string when it was
                        // running alone
                        if (typeof pkg === "string") {
                            pkg = JSON.parse(pkg);
                        }
                        assert(pkg.dependencies[OTHER_PROJECT.split('/')[1]] === OTHER_PROJECT);
                        // TODO
                    });

                    it.skip('should add the project to the .webgme.json', function() {
                        var config = require(path.join(PROJECT_DIR,'.webgme.json'));
                        console.log('config:', config.dependencies);
                        assert.notEqual(config.dependencies[OTHER_PLUGIN], undefined);
                    });

                    it.skip('should add the path to the webgme config', function() {
                    });

                    it.skip('should accept project with hash', function() {
                    });

                    it.skip('should accept url for project', function() {
                        // Such as bitbucket
                    });

                });
            });
        });

        after(function(done) {
            if (fs.existsSync(PROJECT_DIR)) {
                rm_rf(PROJECT_DIR, done);
            } else {
                done();
            }
        });
    });
});
