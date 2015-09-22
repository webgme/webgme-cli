/*globals describe,it,before,beforeEach,after*/
var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    sinon = require('sinon'),
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
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleSeedProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = __dirname+'/res/OtherProject',
    OTHER_SEED = 'OtherSeed',
    otherProject;

describe('Seed tests', function() {
    'use strict';
    
    var SEED_NAME = 'MyWebGMEProject',
        SeedBasePath = path.join(PROJECT_DIR, 'src', 'seeds'),
        SEED_SRC = path.join(SeedBasePath, SEED_NAME, SEED_NAME+'.js'),
        SEED_TEST = path.join(PROJECT_DIR, 'test', 'seeds', SEED_NAME, SEED_NAME+'.spec.js');

    before(function(done) {
        var after = function() {
            process.chdir(PROJECT_DIR);
            done();
        };
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, function() {
                callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, after);
            });
        } else {
            callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, after);
        }
    });

    describe('new seed', function() {
        var passingPromise = {
                then: function(fn) {
                    fn();
                    return {fail: function(){}};
                }
            };
        var failingPromise = {
                then: function() {
                    return {fail: function(fn){
                        return fn();
                    }};
                }
            };

        before(function(done) {
            this.timeout(3000);
            webgmeManager.createManagers(done);
        });

        it('should call the WebGME export script', function(done) {
            var seedManager = webgmeManager.componentManagers.seed;
            seedManager._exportProject = function() {
                return passingPromise;
            };
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'new', 'seed', SEED_NAME]
            }, function() {
                done();
            });
        });

        it('should pass required args to WebGME export script', function(done) {
            var requiredArgs = [
                'gmeConfig',
                'projectName',
                'source',
                'outFile'
            ];
            var seedManager = webgmeManager.componentManagers.seed;
            seedManager._exportProject = function(params) {
                var args = Object.keys(params);
                assert(_.difference(args, requiredArgs).length === 0);
                return passingPromise;
            };
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'new', 'seed', 'myNewSeed']
            }, function() {
                done();
            });
        });

        it('should save relative path', function(done) {
            var seedManager = webgmeManager.componentManagers.seed;
            seedManager._exportProject = function(params) {
                return passingPromise;
            };
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'new', 'seed', 'myNewSeed2']
            }, function() {
                // Check the webgem-setup.json
                var configContent = fs.readFileSync(CONFIG_PATH,'utf8'),
                    config = JSON.parse(configContent),
                    srcPath = config.components.seeds.myNewSeed2.src;

                assert(!path.isAbsolute(srcPath));
                done();
            });
        });

        it('should enable seedProjects in config.webgme.js', function(done) {
            var seedManager = webgmeManager.componentManagers.seed;
            seedManager._exportProject = function(params) {
                return passingPromise;
            };
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'new', 'seed', 'myNewSeed3']
            }, function() {
                // Check the webgem-setup.json
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = require(configPath);

                assert(config.seedProjects.enable);
                done();
            });
        });

        it('should not create seed directory on fail', function(done) {
            var seedName = 'failingSeed',
                seedManager = webgmeManager.componentManagers.seed;
            seedManager._exportProject = function(params) {
                return failingPromise;
            };
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'new', 'seed', seedName]
            }, function() {
                // Check the webgme-setup.json
                var seedPath = path.join(SeedBasePath, seedName);
                assert(!fs.existsSync(seedPath));
                done();
            });
        });
    });

    describe.skip('rm seed', function() {
        var SEED_NAME = 'RemoveMe';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            // Copy the 'test/res/OtherProject' to the TMP_DIR and remove
            // a seed
            // TODO
        });
    });

    describe('add seed', function() {

        describe('errors', function() {
            before(function() {
                process.chdir(PROJECT_DIR);
            });

            it('should not miss seed or project', function(done) {
                emitter.once('error', done.bind(this, undefined));
                callWebGME({_: ['node', 'webgme', 'add', 'seed', OTHER_SEED]});
            });

            it('should have seed from project', function(done) {
                this.timeout(4000);
                emitter.once('error', done.bind(this, undefined));
                callWebGME({_: ['node', 'webgme', 'add', 'seed', 'blah', OTHER_PROJECT]});
            });
        });

        describe('projects NOT created with webgme-setup-tool', function() {
            before(function(done) {
                otherProject = __dirname+'/res/NonCliProj';
                this.timeout(10000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                callWebGME({
                    _: ['node', 'webgme', 'add', 'seed', OTHER_SEED, otherProject]
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
                assert.notEqual(config.dependencies.seeds[OTHER_SEED], undefined);
            });

            it('should add the path to the webgme config', function() {
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = fs.readFileSync(configPath, 'utf8'),
                    paths = config.match(/seedProjects.*/g).join(';'),
                    moduleName;

                moduleName = otherProject.split('/').pop().toLowerCase();
                assert.notEqual(paths.indexOf(moduleName), -1);
            });

            describe('rm dependency seed', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    callWebGME({
                        _: ['node', 'webgme', 'rm', 'seed', OTHER_SEED]
                    }, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.seedProjects.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_SEED), -1);
                });

                it('should remove seed entry from '+CONFIG_NAME, function() {
                    var configText = fs.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.seeds[OTHER_SEED], undefined);
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
            var cliProject = __dirname+'/res/OtherProject';
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                callWebGME({
                    _: ['node', 'webgme', 'add', 'seed', OTHER_SEED, cliProject]
                }, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = cliProject.split('/').pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fs.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.seeds[OTHER_SEED], undefined);
            });

            it('should add the path to the webgme config', function() {
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = fs.readFileSync(configPath, 'utf8'),
                    paths = config.match(/seedProjects.*/g).join(';'),
                    projectName = cliProject.split('/').pop().toLowerCase();

                assert(paths.indexOf(projectName) !== -1);
            });

            it('should add the (relative) path to the webgme config', function() {
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = fs.readFileSync(configPath, 'utf8'),
                    lines = config.match(/seedProjects.*/g),  // One per line
                    paths = lines.map(function(line) { 
                        return line.match(/['"]{1}.*['"]{1}/)[0]; 
                    });

                for (var i = paths.length; i--;) {
                    assert(!path.isAbsolute(paths[i]), 'Found absolute path: '+paths[i]);
                }
            });

            describe('rm dependency seed', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    callWebGME({
                        _: ['node', 'webgme', 'rm', 'seed', OTHER_SEED]
                    }, done);
                });

                it('should remove the path from the webgme config', function() {
                    var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                        config = fs.readFileSync(configPath, 'utf8'),
                        paths = config.match(/seedProjects.*/g);

                    assert(paths === null || paths.join(';').indexOf(OTHER_SEED) === -1);
                });

                it('should remove seed entry from '+CONFIG_NAME, function() {
                    var configText = fs.readFileSync(CONFIG_PATH, 'utf8'),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.seeds[OTHER_SEED], undefined);
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