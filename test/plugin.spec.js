/*globals it,describe,before,after*/
var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    nop = require('nop'),
    fse = require('fs-extra'),
    Logger = require('../src/Logger'),
    PluginManager = require(__dirname+'/../src/PluginManager'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new PluginManager(logger),
    emitter = logger._emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExamplePluginProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname, 'res', 'OtherProject'),
    OTHER_PLUGIN = 'OtherPlugin',
    otherProject;

describe('Plugin tests', function() {
    'use strict';
    
    var PLUGIN_NAME = 'MyNewPlugin',
        PluginBasePath = path.join(PROJECT_DIR, 'src', 'plugins'),
        PLUGIN_SRC = path.join(PluginBasePath, PLUGIN_NAME, PLUGIN_NAME+'.js'),
        PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugins', PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

    before(function(done) {
        utils.getCleanProject(PROJECT_DIR, done);
    });

    describe('new plugin', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({pluginID: PLUGIN_NAME, meta: true}, done);
        });

        it('should create the plugin source file', function() {
            assert(fse.existsSync(PLUGIN_SRC));
        });

        it('should be valid js', function() {
            var content = fse.readFileSync(PLUGIN_SRC, 'utf8');
            assert(utils.isValidJs(content));
        });

        it('should not have desc (if none provided)', function() {
            var content = fse.readFileSync(PLUGIN_SRC, 'utf8');
            assert.equal(content.indexOf('getDescription'), -1);
        });

        it('should create the plugin\'s test file', function() {
            assert(fse.existsSync(PLUGIN_TEST));
        });

        it('should not create the plugin\'s meta file', function() {
            var metaPath = path.join(PluginBasePath, PLUGIN_NAME, 'meta.js');
            assert(!fse.existsSync(metaPath));
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
                manager.new({pluginID: secondPluginName}, done);
            });

            it('should have both dirs in src/plugins', function() {
                [PLUGIN_NAME, secondPluginName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'plugins', name);
                    })
                    .forEach(function(pluginPath) {
                        assert(fse.existsSync(pluginPath));
                    });
            });
        });

        describe('options', function() {
            var NoTestPlugin = 'NoTestForMe';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({pluginID: NoTestPlugin,
                             test: false,
                             pluginName: 'MyNewPlugin'}, done);
            });

            it('should not create test file', function() {
                var testPath = path.join(PROJECT_DIR, 'test', 'plugins', NoTestPlugin, NoTestPlugin+'.js');
                assert(!fse.existsSync(testPath), 'Created test file');
            });

            it('should have the new name in the source file', function() {
                var srcPath = path.join(PROJECT_DIR, 'src', 'plugins', NoTestPlugin, NoTestPlugin+'.js'),
                    content = fse.readFileSync(srcPath, 'utf8');
                assert(content.indexOf('MyNewPlugin') > -1, 'Does not have the name in the source');
            });
        });

        describe('test file', function() {
            var PLUGIN_TEST = path.join(PROJECT_DIR, 'test', 'plugins',
                PLUGIN_NAME, PLUGIN_NAME+'.spec.js');

            it('should create test file in test/plugin', function() {
                assert(fse.existsSync(PLUGIN_TEST));
            });

            it('should have correct path for test fixtures', function() {
                var testContent = fse.readFileSync(PLUGIN_TEST, 'utf8'),
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

                manager.ls({}, nop);
            });

            it('should not list plugins in wrong directory ', function(done) {
                process.chdir(__dirname);
                manager.ls({}, function(err) {
                    console.log('err:', err);
                    assert(err);
                    process.chdir(PROJECT_DIR);
                    done();
                });
            });
        });
    });

    describe('rm plugin', function() {
        var PLUGIN_NAME = 'RemoveMe';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            manager.rm({name: 'MyPlugin'}, done);
        });

        it('should remove plugin src directory', function() {
            var pluginPath = path.join(PROJECT_DIR, 'src', 'plugins', PLUGIN_NAME);
            assert.equal(fse.existsSync(pluginPath), false);
        });

        it('should remove plugin test directory', function() {
            var pluginPath = path.join(PROJECT_DIR, 'test', 'plugins', PLUGIN_NAME);
            assert.equal(fse.existsSync(pluginPath), false);
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
                manager.add({name: OTHER_PLUGIN}, nop);
            });

            // FIXME
            //it('should fail if project is missing plugin', function(done) {
                //emitter.once('error', done.bind(this,null));
                //callWebGME({_: ['node', 'webgme', 'add', 'plugin', 'blah', OTHER_PROJECT]});
            //});
        });

        describe('projects NOT created with webgme-setup-tool', function() {
            var previousDir, oldConfigPath;
            otherProject = path.join(__dirname+'res', 'NonCliProj');
            before(function(done) {
                this.timeout(10000);
                oldConfigPath = CONFIG_PATH;
                previousDir = PROJECT_DIR;
                PROJECT_DIR = path.join(PROJECT_DIR, 'NewProject');
                CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
                utils.getCleanProject(PROJECT_DIR, function() {
                    process.chdir(PROJECT_DIR);
                    emitter.on('error', assert.bind(assert, false));
                    manager.add({name: OTHER_PLUGIN, 
                                 project: otherProject}, done);
                });
            });

            after(function() {
                PROJECT_DIR = previousDir;
                CONFIG_PATH = oldConfigPath;
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split(path.sep).pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fse.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugins[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.plugin.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            it('should add the relative path to the requirejsPaths webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig));

                assert.notEqual(config.requirejsPaths[OTHER_PLUGIN], undefined);
                assert.notEqual(config.requirejsPaths[OTHER_PLUGIN][0], '/');
            });

            describe('rm dependency plugin', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_PLUGIN}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.plugin.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_PLUGIN), -1);
                });

                it('should remove plugin entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
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
            otherProject = path.join(__dirname, 'res', 'OtherProject');
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                manager.add({name: OTHER_PLUGIN, 
                             project: otherProject}, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split(path.sep).pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fse.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.plugins[OTHER_PLUGIN], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.plugin.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            describe('rm dependency plugin', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_PLUGIN}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.plugin.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_PLUGIN), -1);
                });

                it('should remove plugin entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
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
        if (fse.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, done);
        } else {
            done();
        }
    });
});
