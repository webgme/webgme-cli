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
    if (callback === undefined) {
        callback = function(){};
    }
    webgmeManager.executeCommand(_.extend({_: ['node', 'cli.js']}, args), callback);
};

var TMP_DIR = path.join(__dirname, '..', 'test-tmp');
var PROJECT_DIR = path.join(TMP_DIR, 'ExamplePluginProject');
var OTHER_PROJECT = __dirname+'/res/OtherProject';
var OTHER_PLUGIN = 'OtherPlugin';
describe('Plugin tests', function() {
    var PLUGIN_NAME = 'MyNewPlugin',
        PluginBasePath = path.join(PROJECT_DIR, 'src', 'plugin'),
        PLUGIN_SRC = path.join(PluginBasePath, PLUGIN_NAME, PLUGIN_NAME+'.js'),
        PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugin', PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

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
            assert.notEqual(config.components.plugin[PLUGIN_NAME], undefined);
        });

        describe('test file', function() {
            var PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugin',
                PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

            it('should create test file in test/plugin', function() {
                assert(fs.existsSync(PLUGIN_TEST));
            });

            it('should have correct path for test fixtures', function() {
                var testContent = fs.readFileSync(PLUGIN_TEST, 'utf8'),
                    fixtureRegex = /require\('(.*)'\)/,
                    result = fixtureRegex.exec(testContent);
                assert(result[1] === 'webgme/test/_globals')
            });
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
            var pluginPath = path.join(PROJECT_DIR, 'src', 'plugin', PLUGIN_NAME);
            assert.equal(fs.existsSync(pluginPath), false);
        });

        it('should remove plugin test directory', function() {
            var pluginPath = path.join(PROJECT_DIR, 'test', 'plugin', PLUGIN_NAME);
            assert.equal(fs.existsSync(pluginPath), false);
        });

        it('should remove plugin entry from webgme.json', function() {
            var config = require(path.join(PROJECT_DIR,'.webgme.json'));
            assert.equal(config.components.plugin[PLUGIN_NAME], undefined);
        });
    });

    describe('add plugin', function() {

        describe('errors', function() {
            it('should not miss plugin or project', function(done) {
                emitter.once('error', done.bind(this, undefined));
                callWebGME({_: ['node', 'webgme', 'add', 'plugin', OTHER_PLUGIN]});
            });

            it('should have plugin from project', function(done) {
                emitter.once('error', done.bind(this, undefined));
                callWebGME({_: ['node', 'webgme', 'add', 'plugin', 'blah', OTHER_PROJECT]});
            });
        });

        describe('projects NOT created with webgme-cli', function() {
            otherProject = __dirname+'/res/NonCliProj';
            before(function(done) {
                this.timeout(10000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                callWebGME({
                    _: ['node', 'webgme', 'add', 'plugin', OTHER_PLUGIN, otherProject]
                }, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split('/').pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the .webgme.json', function() {
                var configPath = path.join(PROJECT_DIR,'.webgme.json'),
                configText = fs.readFileSync(configPath),
                config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugin[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR,'config.webgme.js')),
                paths = config.plugin.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split('/')[1]), -1);
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
                    assert.equal(config.dependencies.plugin[OTHER_PLUGIN], undefined);
                });

                it.skip('should remove project from package.json', function() {
                    // TODO
                });

                it.skip('should not remove project from package.json if used', function() {
                    // TODO
                });
            });
        });

        describe('projects created with webgme-cli', function() {
            otherProject = __dirname+'/res/OtherProject';
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                callWebGME({
                    _: ['node', 'webgme', 'add', 'plugin', OTHER_PLUGIN, otherProject]
                }, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split('/').pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the .webgme.json', function() {
                var configPath = path.join(PROJECT_DIR,'.webgme.json'),
                configText = fs.readFileSync(configPath),
                config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugin[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR,'config.webgme.js')),
                paths = config.plugin.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split('/')[1]), -1);
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
                    assert.equal(config.dependencies.plugin[OTHER_PLUGIN], undefined);
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

    describe('enable plugin', function() {
        it.skip('should add plugin to project\'s validPlugins', function() {
        // TODO
        });
    });

    describe('disable plugin', function() {
        it.skip('should add plugin to project\'s validPlugins', function() {
        });
        // TODO
    });

    after(function(done) {
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, done);
        } else {
            done();
        }
    });
});
