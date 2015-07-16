/*globals describe,it,before,after*/
var WebGMEComponentManager = require('../src/WebGMEComponentManager');
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
var webgmeManager = new WebGMEComponentManager();

var callWebGME = function(args, callback) {
    'use strict';
    webgmeManager.executeCommand(_.extend({_: ['node', 'cli.js']}, args), callback);
};

describe('WebGME-cli', function() {
    'use strict';

    before(function() {
        emitter = webgmeManager.emitter;
        // sinon.spy(emitter, 'on');
    });

    describe('usage message', function() {
        var usageMsg;
        before(function(done) {
            fs.readFile(__dirname+'/../doc/usage.txt', 'utf-8', function(e, txt) {
                usageMsg = txt;
                done();
            });
        });

        it('should display the usage message if given invalid args', function(done) {
            emitter.once('write', function(msg) {
                assert.equal(msg, usageMsg);
                done();
            });
            callWebGME({_: ['node', 'webgme', 'INVALID', 'THING']});
        });
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

            it('should display help message when given -h', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(msg.indexOf(helpMsg), -1);
                    done();
                });
                callWebGME({h: true});
            });

            describe('custom help messages', function() {
                var getMessage = function(type, action, item) {
                    item += item.length ? '/' : '';
                    action = action.length ? '.'+action : '';
                    return fs.readFileSync(__dirname+'/../doc/'+item+type+action+'.txt', 'utf-8');
                };

                it('should display help message for init', function(done) {
                    emitter.once('write', function(msg) {
                        // Since the new help message is a template, I am just checking the usage line
                        var helpSnippet = getMessage('help', 'init', '').split('\n')[0];
                        assert.notEqual(msg.indexOf(helpSnippet), -1);
                        done();
                    });
                    callWebGME({_: ['node', 'webgme', 'init'], help: true});
                });

                it('should display help message for "new plugin"', function(done) {
                    emitter.once('write', function(msg) {
                        // Since the new help message is a template, I am just checking the usage line
                        newHelpSnippet = getMessage('help', 'new', 'plugin').split('\n')[0];
                        assert.notEqual(msg.indexOf(newHelpSnippet), -1);
                        done();
                    });
                    callWebGME({_: ['node', 'webgme', 'new', 'plugin'], help: true});
                });
            });

            it('should display options for "new plugin --help"', function(done) {
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
                    describe('projects created with webgme-cli', function() {
                        // TODO: Need an example repo for this
                    });

                    describe.skip('projects NOT created with webgme-cli', function() {
                        var OTHER_PROJECT = 'brollb/VisualConstraintLanguage';
                        var OTHER_PLUGIN = 'CodeGenerator';
                        before(function(done) {
                            //this.timeout(35000);
                            process.chdir(PROJECT_DIR);
                            callWebGME({
                                _: ['node', 'webgme', 'add', 'plugin', OTHER_PLUGIN, OTHER_PROJECT]
                            }, done);
                        });

                        it('should add the project to the package.json', function() {
                            // FIXME: This fails only when run with all the other tests
                            var pkg = require(path.join(PROJECT_DIR, 'package.json'));
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
