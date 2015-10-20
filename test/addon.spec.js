/*globals it,describe,before,after*/
var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    nop = require('nop'),
    fse = require('fs-extra'),
    Logger = require('../src/Logger'),
    AddonManager = require(__dirname+'/../src/AddonManager'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new AddonManager(logger),
    emitter = logger._emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleAddonProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname, 'res', 'OtherProject'),
    OTHER_ADDON = 'OtherAddon',
    otherProject;

describe('Addon tests', function() {
    'use strict';
    
    var ADDON_NAME = 'MyNewAddon',
        AddonBasePath = path.join(PROJECT_DIR, 'src', 'addons'),
        ADDON_SRC = path.join(AddonBasePath, ADDON_NAME, ADDON_NAME+'.js'),
        ADDON_TEST = path.join(PROJECT_DIR, 'test', 'addons', ADDON_NAME, ADDON_NAME+'.spec.js');

    before(function(done) {
        utils.getCleanProject(PROJECT_DIR, done);
    });

    describe('new addon', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({addOnId: ADDON_NAME, meta: true}, done);
        });

        it('should create the addon source file', function() {
            assert(fse.existsSync(ADDON_SRC));
        });

        it('should be valid js', function() {
            var content = fse.readFileSync(ADDON_SRC, 'utf8');
            assert(utils.isValidJs(content));
        });

        it('should not have desc (if none provided)', function() {
            var content = fse.readFileSync(ADDON_SRC, 'utf8');
            assert.equal(content.indexOf('getDescription'), -1);
        });

        it('should set addonName to addonId by default', function() {
            var content = fse.readFileSync(ADDON_SRC, 'utf8');
            assert.equal(content.indexOf('New Addon'), -1);
        });

        it('should add the addon (relative) path to the config file', function() {
            var config = require(path.join(PROJECT_DIR, WebGMEConfig));
            // check that basePath has been added!
            var relativeBase = AddonBasePath.replace(PROJECT_DIR+path.sep, '');
            assert.notEqual(config.addOn.basePaths.indexOf(relativeBase), -1);
        });

        it('should record the addon in webgme-setup.json', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.addons[ADDON_NAME], undefined);
        });

        describe('2nd addon', function() {
            var secondAddonName = 'ABrandNewAddon';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({addOnId: secondAddonName}, done);
            });

            it('should have both dirs in src/addons', function() {
                [ADDON_NAME, secondAddonName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'addons', name);
                    })
                    .forEach(function(addonPath) {
                        assert(fse.existsSync(addonPath));
                    });
            });
        });

        describe('options', function() {
            var NoTestAddon = 'NoTestForMe';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({addOnId: NoTestAddon,
                             addOnName: 'MyNewAddon'}, done);
            });

            it('should have the new name in the source file', function() {
                var srcPath = path.join(PROJECT_DIR, 'src', 'addons', NoTestAddon, NoTestAddon+'.js'),
                    content = fse.readFileSync(srcPath, 'utf8');
                assert(content.indexOf('MyNewAddon') > -1, 'Does not have the name in the source');
            });
        });

        describe('list addons', function() {
            it('should list the new addon', function(done) {
                manager.ls({}, function(err, addons) {
                    assert.notEqual(-1, addons.components.indexOf(ADDON_NAME));
                    done();
                });
            });

            it('should not list addons in wrong directory ', function(done) {
                process.chdir(__dirname);
                manager.ls({}, function(err) {
                    assert(err);
                    process.chdir(PROJECT_DIR);
                    done();
                });
            });
        });
    });

    describe('rm addon', function() {
        var ADDON_NAME = 'RemoveMe';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            manager.rm({name: 'MyAddon'}, done);
        });

        it('should remove addon src directory', function() {
            var addonPath = path.join(PROJECT_DIR, 'src', 'addons', ADDON_NAME);
            assert.equal(fse.existsSync(addonPath), false);
        });

        it('should remove addon test directory', function() {
            var addonPath = path.join(PROJECT_DIR, 'test', 'addons', ADDON_NAME);
            assert.equal(fse.existsSync(addonPath), false);
        });

        it('should remove addon entry from '+CONFIG_NAME, function() {
            var config = require(CONFIG_PATH);
            assert.equal(config.components.addons[ADDON_NAME], undefined);
        });
    });

    describe('add addon', function() {

        describe('errors', function() {
            it('should not miss addon or project', function(done) {
                emitter.once('error', done.bind(this, null));
                manager.add({name: OTHER_ADDON}, nop);
            });

            // FIXME
            //it('should fail if project is missing addon', function(done) {
                //emitter.once('error', done.bind(this,null));
                //callWebGME({_: ['node', 'webgme', 'add', 'addon', 'blah', OTHER_PROJECT]});
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
                    manager.add({name: OTHER_ADDON, 
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
                assert.notEqual(config.dependencies.addons[OTHER_ADDON], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.addOn.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            it('should add the relative path to the requirejsPaths webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig));

                assert.notEqual(config.requirejsPaths[OTHER_ADDON], undefined);
                assert.notEqual(config.requirejsPaths[OTHER_ADDON][0], '/');
            });

            describe('rm dependency addon', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_ADDON}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.addOn.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_ADDON), -1);
                });

                it('should remove addon entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.addons[OTHER_ADDON], undefined);
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
                manager.add({name: OTHER_ADDON, 
                             project: otherProject}, function() {
                    utils.requireReload(
                        path.join(PROJECT_DIR, 'package.json')
                    );
                    done();
                });
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split(path.sep).pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fse.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.addons[OTHER_ADDON], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.addOn.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            describe('rm dependency addon', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_ADDON}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.addOn.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_ADDON), -1);
                });

                it('should remove addon entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.addons[OTHER_ADDON], undefined);
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
