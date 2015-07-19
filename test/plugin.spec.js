var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var WebGMEComponentManager = require('../src/WebGMEComponentManager');
var WebGMEConfig = 'config.webgme.js';
var webgmeManager = new WebGMEComponentManager();
var emitter = webgmeManager.emitter;

var callWebGME = function(args, callback) {
    'use strict';
    webgmeManager.executeCommand(_.extend({_: ['node', 'cli.js']}, args), callback);
};

var TMP_DIR = path.join(__dirname, '..', 'test-tmp');
var PROJECT_DIR = path.join(TMP_DIR, 'ExamplePluginProject');
describe('Plugin tests', function() {
    var PLUGIN_NAME = 'MyNewPlugin',
        PluginBasePath = path.join(PROJECT_DIR, 'src', 'plugins'),
        PLUGIN_SRC = path.join(PluginBasePath, PLUGIN_NAME, PLUGIN_NAME+'.js'),
        PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugins', PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

    before(function(done) {
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, function() {
                callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
            });
        } else {
            callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
        }
    });

    describe('new plugin', function() {
        before(function(done) {
            emitter.on('error', assert.bind(assert, false));  // REMOVE
            process.chdir(PROJECT_DIR);  // Start in different directory
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
            assert.equal(config.components.plugins[PLUGIN_NAME], undefined);
        });
    });

    describe('add plugin', function() {
        var OTHER_PROJECT;
        var OTHER_PLUGIN;
        // FIXME: Change this to an actual repo on github
        // so it can pass
        describe('projects created with webgme-cli', function() {
            // TODO: Need an example repo for this
        });

        describe('projects NOT created with webgme-cli', function() {
            OTHER_PROJECT = __dirname+'/res/OtherProject';
            OTHER_PLUGIN = 'OtherPlugin';
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                //emitter.on('info', console.log);
                callWebGME({
                    _: ['node', 'webgme', 'add', 'plugin', OTHER_PLUGIN, OTHER_PROJECT, '-v']
                }, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = OTHER_PROJECT.split('/').pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the .webgme.json', function() {
                var configPath = path.join(PROJECT_DIR,'.webgme.json'),
                    configText = fs.readFileSync(configPath),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugins[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR,'config.webgme.js')),
                paths = config.plugin.basePaths.join(';');
                assert.notEqual(paths.indexOf(OTHER_PROJECT.split('/')[1]), -1);
            });

            describe('rm dependency plugin', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    callWebGME({
                        _: ['node', 'webgme', 'rm', 'plugin', OTHER_PLUGIN]
                    }, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR,'config.webgme.js')),
                    paths = config.plugin.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_PLUGIN), -1);
                });

                it('should remove plugin entry from webgme.json', function() {
                    var configText = fs.readFileSync(path.join(PROJECT_DIR,'.webgme.json')),
                    config = JSON.parse(configText);
                    assert.equal(config.dependencies.plugins[OTHER_PLUGIN], undefined);
                });

                it.skip('should remove project from package.json', function() {
                    // TODO
                });

                it.skip('should not remove project from package.json if used', function() {
                    // TODO
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

