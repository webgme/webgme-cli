/*globals it,describe,before,after*/
var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var WebGMEComponentManager = require('../src/WebGMEComponentManager');
var WebGMEConfig = path.join('config', 'config.webgme.js');
var webgmeManager = new WebGMEComponentManager();
var emitter = webgmeManager.logger._emitter;

var callWebGME = function(args, callback) {
    'use strict';
    if (callback === undefined) {
        callback = function(){};
    }
    webgmeManager.executeCommand(_.extend({_: ['node', 'cli.js']}, args), callback);
};

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExamplePluginProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = __dirname+'/res/OtherProject',
    OTHER_PLUGIN = 'OtherPlugin',
    otherProject;

describe('Plugin tests', function() {
    'use strict';
    
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
            var config = require(path.join(PROJECT_DIR, WebGMEConfig));
            // check that basePath has been added!
            var relativeBase = PluginBasePath.replace(PROJECT_DIR+path.sep, '');
            assert.notEqual(config.plugin.basePaths.indexOf(relativeBase), -1);
        });

        it('should record the plugin in .webgme file', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.plugins[PLUGIN_NAME], undefined);
        });

        describe('2nd plugin', function() {
            var secondPluginName = 'ABrandNewPlugin';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                callWebGME({
                    _: ['node', 'webgme', 'new', 'plugin', secondPluginName]
                }, done);
            });

            it('should have both dirs in src/plugins', function() {
                [PLUGIN_NAME, secondPluginName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'plugins', name);
                    })
                    .forEach(function(pluginPath) {
                        assert(fs.existsSync(pluginPath));
                    });
            });
        });

        describe('options', function() {
            var NoTestPlugin = 'NoTestForMe';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                callWebGME({
                    _: ['node', 'webgme', 'new', 'plugin', NoTestPlugin],
                    'test': false
                }, done);
            });
            it('should not create test file', function() {
                var testPath = path.join(PROJECT_DIR, 'test', 'plugins', NoTestPlugin, NoTestPlugin+'.js');
                assert(!fs.existsSync(testPath), 'Created meta.js file');
            });


        });

        describe('test file', function() {
            var PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugins',
                PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

            it('should create test file in test/plugin', function() {
                assert(fs.existsSync(PLUGIN_TEST));
            });

            it('should have correct path for test fixtures', function() {
                var testContent = fs.readFileSync(PLUGIN_TEST, 'utf8'),
                    fixtureRegex = /require\('(.*)'\)/,
                    result = fixtureRegex.exec(testContent);
                assert(result[1] === '../../globals');
            });
        });

        describe('list plugins', function() {
            it('should list the new plugin', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(-1, msg.indexOf(PLUGIN_NAME));
                    done();
                });

                callWebGME({_: ['node', 'webgme', 'ls', 'plugin']});
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
            var pluginPath = path.join(PROJECT_DIR, 'src', 'plugins', PLUGIN_NAME);
            assert.equal(fs.existsSync(pluginPath), false);
        });

        it('should remove plugin test directory', function() {
            var pluginPath = path.join(PROJECT_DIR, 'test', 'plugins', PLUGIN_NAME);
            assert.equal(fs.existsSync(pluginPath), false);
        });

        it('should remove plugin entry from '+CONFIG_NAME, function() {
            var config = require(CONFIG_PATH);
            assert.equal(config.components.plugins[PLUGIN_NAME], undefined);
        });
    });

    describe('add plugin', function() {

        describe('errors', function() {
            it('should not miss plugin or project', function(done) {
                emitter.once('error', done.bind(this, null));
                callWebGME({_: ['node', 'webgme', 'add', 'plugin', OTHER_PLUGIN]});
            });

            // FIXME
            //it('should fail if project is missing plugin', function(done) {
                //emitter.once('error', done.bind(this,null));
                //callWebGME({_: ['node', 'webgme', 'add', 'plugin', 'blah', OTHER_PROJECT]});
            //});
        });

        describe('projects NOT created with webgme-setup-tool', function() {
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

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fs.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugins[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
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
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.plugin.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_PLUGIN), -1);
                });

                it('should remove plugin entry from '+CONFIG_NAME, function() {
                    var configText = fs.readFileSync(CONFIG_PATH),
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

        describe('projects created with webgme-setup-tool', function() {
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

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fs.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugins[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
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
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.plugin.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_PLUGIN), -1);
                });

                it('should remove plugin entry from '+CONFIG_NAME, function() {
                    var configText = fs.readFileSync(CONFIG_PATH),
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
