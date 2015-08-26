/*globals describe,it,before,beforeEach,after*/
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

// Useful Constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleAddOnProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleAddOnProject'),
    OTHER_PROJECT = __dirname+'/res/OtherProject',
    OTHER_ADDON = 'OtherAddOn',
    otherProject;

describe('AddOn tests', function() {
    'use strict';

    var ADDON_ID = 'MyNewAddOn',
        ADDON_NAME = 'NewAddOnName',
        AddOnBasePath = path.join(PROJECT_DIR, 'src', 'addOn'),
        ADDON_DIR = path.join(AddOnBasePath, ADDON_ID),
        ADDON_SRC = path.join(AddOnBasePath, ADDON_ID, ADDON_ID+'.js'),
        ADDON_TEST = path.join(PROJECT_DIR, 'test', 'addOn', ADDON_ID, ADDON_ID+'.spec.js');

    before(function(done) {
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, function() {
                callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
            });
        } else {
            callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
        }
    });

    describe('new addOn', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            ADDON_ID = 'MyNewAddOn';
            callWebGME({
                _: ['node', 'webgme', 'new', 'addOn', ADDON_NAME],
                id: ADDON_ID
            }, done);
        });

        it('should create the addOn source file', function() {
            assert(fs.existsSync(ADDON_SRC));
        });

        it('should add the addOn (relative) path to the config file', function() {
            var configPath = path.join(PROJECT_DIR, 'config.webgme.js'),
                configText = fs.readFileSync(configPath,'utf-8');
            assert.notEqual(configText.indexOf(ADDON_ID), -1);
        });

        it('should record the addOn in .webgme file', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.addOn[ADDON_ID], undefined);
        });

        it('should record relative path in .webgme file', function() {
            var config = require(CONFIG_PATH),
                srcPath = config.components.addOn[ADDON_ID].srcPath;
            assert(!path.isAbsolute(srcPath));
        });

        it('should enable addOns in the webgme config', function() {
            var config = require(path.join(PROJECT_DIR, 'config.webgme.js'));
            assert(config.addOn.enable);
        });

        describe('list addOns', function() {
            it('should list the new addOn', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(-1, msg.indexOf(ADDON_ID));
                    done();
                });

                callWebGME({_: ['node', 'webgme', 'ls', 'addOn']});
            });
        });

        describe('rm addOn', function() {
            before(function(done) {
                callWebGME({
                    _: ['node', 'webgme', 'rm', 'addOn', ADDON_ID]
                }, done);
            });

            it('should remove the addOn file', function() {
                assert(!fs.existsSync(ADDON_SRC));
            });

            it('should remove the addOn dir', function() {
                assert(!fs.existsSync(ADDON_DIR));
            });

            it('should remove the addOn (relative) path from config', function() {
                var configPath = path.join(PROJECT_DIR, 'config.webgme.js'),
                    configText = fs.readFileSync(configPath, 'utf-8');
                assert.equal(configText.indexOf(ADDON_ID), -1);
            });

            it('should remove the addOn from .webgme file', function() {
                var configContent = fs.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configContent);
                assert.equal(config.components.addOn[ADDON_ID], undefined);
            });
        });
    });

    describe('add addOn', function() {

        describe('projects NOT created with webgme-setup-tool', function() {
            before(function(done) {
                this.timeout(10000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                otherProject = __dirname+'/res/NonCliProj';
                OTHER_ADDON = 'MockAddOn';
                callWebGME({
                    _: ['node', 'webgme', 'add', 'addOn', OTHER_ADDON, otherProject]
                }, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split('/').pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the .webgme.json', function() {
                var configPath = CONFIG_PATH,
                configText = fs.readFileSync(configPath),
                config = JSON.parse(configText);
                assert.notEqual(config.dependencies.addOn[OTHER_ADDON], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR,'config.webgme.js')),
                paths = config.addOn.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split('/')[1]), -1);
            });

            describe('rm dependency addOn', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    callWebGME({
                        _: ['node', 'webgme', 'rm', 'addOn', OTHER_ADDON]
                    }, done);
                });

                it('should remove the path from the webgme config', function() {
                    var configPath = path.join(PROJECT_DIR,'config.webgme.js'),
                        configText = fs.readFileSync(configPath,'utf8');
                    assert.equal(configText.indexOf(OTHER_ADDON), -1);
                });

                it('should remove addOn entry from webgme.json', function() {
                    var configText = fs.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                    assert.equal(config.dependencies.addOn[OTHER_ADDON], undefined);
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
                    _: ['node', 'webgme', 'add', 'addOn', OTHER_ADDON, otherProject]
                }, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split('/').pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the .webgme.json', function() {
                var configPath = CONFIG_PATH,
                configText = fs.readFileSync(configPath),
                config = JSON.parse(configText);
                assert.notEqual(config.dependencies.addOn[OTHER_ADDON], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR,'config.webgme.js')),
                paths = config.addOn.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split('/')[1]), -1);
            });

            describe('rm dependency addOn', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    callWebGME({
                        _: ['node', 'webgme', 'rm', 'addOn', OTHER_ADDON]
                    }, done);
                });

                it('should remove the path from the webgme config', function() {
                    var configPath = path.join(PROJECT_DIR,'config.webgme.js'),
                        configText = fs.readFileSync(configPath, 'utf8');
                    assert.equal(configText.indexOf(OTHER_ADDON), -1);
                });

                it('should remove addOn entry from webgme.json', function() {
                    var configText = fs.readFileSync(CONFIG_PATH, 'utf8'),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.addOn[OTHER_ADDON], undefined);
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
