/*globals describe,it,before,beforeEach,after*/
var SeedManager = require('../lib/SeedManager'),
    Logger = require('../lib/Logger'),
    path = require('path'),
    assert = require('assert'),
    utils = require('./res/utils'),
    fse = require('fs-extra'),
    exists = require('exists-file'),
    rm_rf = require('rimraf'),
    nop = require('nop'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new SeedManager(logger),
    emitter = logger._emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleSeedProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname,'res', 'OtherProject'),
    OTHER_SEED = 'OtherSeed',
    otherProject;

describe('Seed tests', function() {
    'use strict';
    
    var SEED_NAME = 'MyWebGMEProject',
        SeedBasePath = path.join(PROJECT_DIR, 'src', 'seeds'),
        SEED_SRC = path.join(SeedBasePath, SEED_NAME, SEED_NAME+'.js'),
        SEED_TEST = path.join(PROJECT_DIR, 'test', 'seeds', SEED_NAME, SEED_NAME+'.spec.js');

    before(function(done) {
        // Copy the project from /test/res
        utils.getCleanProject(PROJECT_DIR, done);
    });

    // Create a seed from file
    describe('new seed', function() {

        after(function() {
            manager = new SeedManager(logger);
        });

        describe('from file', function() {
            it('should create the seed', function(done) {
                var seedName = 'asdf1234',
                    seedmanager = new SeedManager(logger);

                seedmanager.new({
                    project: seedName,
                    seedName: seedName,
                    file: path.join(
                        __dirname,
                        '..',
                        'node_modules',
                        'webgme-engine',
                        'seeds',
                        'EmptyProject.webgmex'
                    )
                }, err => {
                    var generatedPath = path.join(
                        PROJECT_DIR,
                        'src',
                        'seeds',
                        seedName,
                        seedName + '.webgmex'
                    );
                    assert(!err);
                    assert(exists(generatedPath));
                    done();
                });
            });

            it('should fail if seed file doesn\'t exist', function(done) {
                var seedName = 'asdf1234',
                    seedmanager = new SeedManager(logger);

                seedmanager.new({
                    project: seedName,
                    seedName: seedName,
                    file: path.join(
                        __dirname,
                        '..',
                        'node_modules',
                        'webgme',
                        'seeds',
                        'EmptyProject.webgmex'
                    )
                }, err => {
                    var generatedPath = path.join(
                        PROJECT_DIR,
                        'src',
                        'seeds',
                        seedName,
                        seedName + '.webgmex'
                    );
                    assert(!exists(generatedPath));
                    assert(err.includes('file does not exist'));
                    done();
                });
            });
        });

        it('should call the WebGME export script', function(done) {
            manager._exportProject = function(params, cb) {
                return cb();
            };
            manager.new({project: SEED_NAME}, done);
        });

        it('should pass required args to WebGME export script', function(done) {
            var requiredArgs = [
                'gmeConfig',
                'projectName',
                'branch',
                'user'
            ];
            manager._exportProject = function(params, cb) {
                var args = Object.keys(params);
                assert(_.difference(args, requiredArgs).length === 0);
                return cb(null, 'seedData');
            };
            manager.new({project: 'myNewSeed'}, done);
        });

        it('should save relative path', function(done) {
            manager._exportProject = function(params, cb) {
                return cb(null, 'test');
            };
            manager.new({project: 'myNewSeed2'}, function() {
                // Check the webgem-setup.json
                var configContent = fse.readFileSync(CONFIG_PATH,'utf8'),
                    config = JSON.parse(configContent),
                    srcPath = config.components.seeds.myNewSeed2.src;

                assert(!path.isAbsolute(srcPath));
                done();
            });
        });

        it('should save to src/seeds', function(done) {
            manager._exportProject = function(params, cb) {
                return cb(null, 'test');
            };
            manager.new({project: 'myNewSeed2'}, function() {
                // Check the webgem-setup.json
                var configContent = fse.readFileSync(CONFIG_PATH,'utf8'),
                    config = JSON.parse(configContent),
                    srcPath = config.components.seeds.myNewSeed2.src;

                assert.notEqual(srcPath.indexOf(path.join('src', 'seeds')), -1);
                done();
            });
        });

        it('should enable seedProjects in config.webgme.js', function(done) {
            manager._exportProject = function(params, cb) {
                return cb(null);
            };
            manager.new({project: 'myNewSeed3'}, function() {
                // Check the webgem-setup.json
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = require(configPath);

                assert(config.seedProjects.enable);
                done();
            });
        });

        it('should not create seed directory on fail', function(done) {
            var seedName = 'failingSeed';
            manager._exportProject = function(params, cb) {
                return cb(1);
            };
            manager.new({project: seedName}, function() {
                // Check the webgme-setup.json
                var seedPath = path.join(SeedBasePath, seedName);
                assert(!fse.existsSync(seedPath));
                done();
            });
        });

    });

    describe('import seed', function() {

        describe('errors', function() {
            before(function() {
                process.chdir(PROJECT_DIR);
            });

            it('should not be missing seed or project', function(done) {
                emitter.once('error', done.bind(this, undefined));
                manager.import({project: OTHER_PROJECT}, nop);
            });

            it('should have seed from project', function(done) {
                this.timeout(4000);
                emitter.once('error', done.bind(this, undefined));
                manager.import({name: 'blah', project: OTHER_PROJECT}, nop);
            });
        });

        describe('invalid projects', function() {
            it('should error if invalid project', function(done) {
                otherProject = path.join(__dirname,'res', 'NotANodeProj');
                this.timeout(10000);
                process.chdir(PROJECT_DIR);
                manager.import({name: OTHER_SEED, project: otherProject}, function(err) {
                    assert(err);
                    done();
                });
            });

            it('should error if not webgme project', function(done) {
                otherProject = path.join(__dirname, 'res', 'InvalidProject');
                this.timeout(10000);
                process.chdir(PROJECT_DIR);
                manager.import({name: OTHER_SEED, project: otherProject}, function(err) {
                    assert(err);
                    done();
                });
            });
        });

        describe('projects NOT created with webgme-setup-tool', function() {
            before(function(done) {
                otherProject = path.join(__dirname, 'res', 'NonCliProj');
                this.timeout(10000);
                process.chdir(PROJECT_DIR);
                manager.import({name: OTHER_SEED, project: otherProject}, function() {
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
                assert.notEqual(config.dependencies.seeds[OTHER_SEED], undefined);
            });

            it('should add the path to the webgme config', function() {
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = fse.readFileSync(configPath, 'utf8'),
                    paths = config.match(/seedProjects.*/g).join(';'),
                    moduleName;

                moduleName = otherProject.split(path.sep).pop().toLowerCase();
                assert.notEqual(paths.indexOf(moduleName), -1);
            });

            describe('rm dependency seed', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    utils.requireReload(
                        path.join(PROJECT_DIR, WebGMEConfig)
                    );
                    manager.rm({name: OTHER_SEED}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                        configText = fse.readFileSync(configPath, 'utf8');
                    assert.equal(configText.indexOf(OTHER_SEED), -1);
                });

                it('should remove seed entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
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

        describe('rm seed', function() {
            var RM_DIR = path.join(PROJECT_DIR, 'RemoveSeedTests'),
                RM_SEED = 'test';

            before(function(done) {
                utils.getCleanProject(RM_DIR, function() {
                    manager.rm({name: RM_SEED}, done);
                });
            });

            it('should remove the path from the webgme config', function() {
                var configPath = path.join(RM_DIR, WebGMEConfig),
                    configText = fse.readFileSync(configPath, 'utf8');
                assert.equal(configText.indexOf(RM_SEED), -1);
            });

            it('should remove seed entry from '+CONFIG_NAME, function() {
                var configText = fse.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.equal(config.dependencies.seeds[RM_SEED], undefined);
            });
        });

        describe('projects created with webgme-setup-tool', function() {
            var cliProject = path.join(__dirname, 'res', 'OtherProject');
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                manager.import({name: OTHER_SEED, project: cliProject}, done);
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = cliProject.split(path.sep).pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fse.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);
                assert.notEqual(config.dependencies.seeds[OTHER_SEED], undefined);
            });

            it('should add the path to the webgme config', function() {
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = fse.readFileSync(configPath, 'utf8'),
                    paths = config.match(/seedProjects.*/g).join(';'),
                    projectName = cliProject.split(path.sep).pop().toLowerCase();

                assert(paths.indexOf(projectName) !== -1);
            });

            it('should add the (relative) path to the webgme config', function() {
                var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                    config = fse.readFileSync(configPath, 'utf8'),
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
                    manager.rm({name: OTHER_SEED}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                        config = fse.readFileSync(configPath, 'utf8'),
                        paths = config.match(/seedProjects.*/g);

                    assert(paths === null || paths.join(';').indexOf(OTHER_SEED) === -1);
                });

                it('should remove seed entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH, 'utf8'),
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

            describe('list seeds', function() {
                var LS_PROJ = path.join(PROJECT_DIR, 'ListSeeds');
                before(function(done) {
                    utils.getCleanProject(LS_PROJ , function() {
                        process.chdir(LS_PROJ);
                        done();
                    });
                });

                it('should list the new seed', function(done) {
                    manager.ls({}, function(err, seeds) {
                        assert.notEqual(-1, seeds.components.indexOf('test'));
                        done();
                    });
                });

                it('should not list seeds in wrong directory ', function(done) {
                    process.chdir(__dirname);

                    manager.ls({}, err => {
                        assert.notEqual(err.indexOf('Could not find a project'), -1);
                        done();
                    });  // This should error
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
