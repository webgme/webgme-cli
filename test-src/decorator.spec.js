/*globals it,describe,before,after*/
var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    nop = require('nop'),
    fse = require('fs-extra'),
    Logger = require('../lib/Logger'),
    DecoratorManager = require(__dirname+'/../lib/DecoratorManager'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new DecoratorManager(logger),
    emitter = logger._emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleDecoratorProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname, 'res', 'OtherProject'),
    OTHER_DECORATOR = 'OtherDecorator',
    otherProject;

describe('Decorator tests', function() {
    'use strict';
    
    var RAW_DECORATOR_NAME = 'MyNew',
        DECORATOR_NAME = 'MyNewDecorator',
        DecoratorBasePath = path.join(PROJECT_DIR, 'src', 'decorators'),
        DECORATOR_SRC = path.join(DecoratorBasePath, DECORATOR_NAME, DECORATOR_NAME+'.js'),
        DECORATOR_TEST = path.join(PROJECT_DIR, 'test', 'decorators', DECORATOR_NAME, DECORATOR_NAME+'.spec.js');

    before(function(done) {
        utils.getCleanProject(PROJECT_DIR, done);
    });

    describe('new decorator', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({decoratorName: RAW_DECORATOR_NAME, meta: true}, done);
        });

        describe('duplicate "Decorator"', function() {
            before(function(done) {
                var name = 'ANewDecorator';
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({decoratorName: name, meta: true}, done);
            });

            it('should recognize "Decorator" in name and not duplicate', function() {
                var decDir = path.join(PROJECT_DIR, 'src', 'decorators', 'ANewDecorator');
                assert(fse.existsSync(decDir));
            });
        });

        it('should create the decorator source file', function() {
            assert(fse.existsSync(DECORATOR_SRC));
        });

        it('should be valid js', function() {
            var content = fse.readFileSync(DECORATOR_SRC, 'utf8');
            assert(utils.isValidJs(content));
        });

        describe('DiagramDesigner', function() {
            var DD_PATH = path.join(DecoratorBasePath, DECORATOR_NAME, 'DiagramDesigner');
            it('should create the dir', function() {
                assert(fse.existsSync(DD_PATH));
            });

            it('should be non-empty', function() {
                assert.notEqual(fse.readdirSync(DD_PATH).length, 0);
            });
        });


        it('should add the decorator (relative) path to the config file', function() {
            var config = require(path.join(PROJECT_DIR, WebGMEConfig));
            // check that basePath has been added!
            var relativeBase = DecoratorBasePath.replace(PROJECT_DIR+path.sep, '');
            assert.notEqual(config.visualization.decoratorPaths.indexOf(relativeBase), -1);
        });

        it('should record the decorator in webgme-setup.json', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.decorators[DECORATOR_NAME], undefined);
        });

        describe('2nd decorator', function() {
            var secondDecoratorName = 'ABrandNewDecorator';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({decoratorName: 'ABrandNew'}, done);
            });

            it('should have both dirs in src/decorators', function() {
                [DECORATOR_NAME, secondDecoratorName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'decorators', name);
                    })
                    .forEach(function(decoratorPath) {
                        assert(fse.existsSync(decoratorPath));
                    });
            });
        });

        describe('list decorators', function() {
            it('should list the new decorator', function(done) {
                manager.ls({}, function(err, decs) {
                    assert.notEqual(-1, decs.components.indexOf(DECORATOR_NAME));
                    done();
                });
            });

            it('should not list decorators in wrong directory ', function(done) {
                process.chdir(__dirname);
                manager.ls({}, function(err) {
                    assert(err);
                    process.chdir(PROJECT_DIR);
                    done();
                });
            });
        });
    });

    describe('rm decorator', function() {
        var DECORATOR_NAME = 'RemoveMe';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            manager.rm({name: 'MyDecorator'}, done);
        });

        it('should remove decorator src directory', function() {
            var decoratorPath = path.join(PROJECT_DIR, 'src', 'decorators', DECORATOR_NAME);
            assert.equal(fse.existsSync(decoratorPath), false);
        });

        it('should remove decorator test directory', function() {
            var decoratorPath = path.join(PROJECT_DIR, 'test', 'decorators', DECORATOR_NAME);
            assert.equal(fse.existsSync(decoratorPath), false);
        });

        it('should remove decorator entry from '+CONFIG_NAME, function() {
            var config = require(CONFIG_PATH);
            assert.equal(config.components.decorators[DECORATOR_NAME], undefined);
        });
    });

    describe('add decorator', function() {

        describe('errors', function() {
            it('should not miss decorator or project', function(done) {
                emitter.once('error', done.bind(this, null));
                manager.add({name: OTHER_DECORATOR}, nop);
            });

            // FIXME
            //it('should fail if project is missing decorator', function(done) {
                //emitter.once('error', done.bind(this,null));
                //callWebGME({_: ['node', 'webgme', 'add', 'decorator', 'blah', OTHER_PROJECT]});
            //});
        });

        describe('projects NOT created with webgme-setup-tool', function() {
            var previousDir, oldConfigPath,
                otherDecorator = 'CircleDecorator';

            before(function(done) {
                this.timeout(10000);
                otherProject = path.join(__dirname, 'res', 'NonCliProj');
                oldConfigPath = CONFIG_PATH;
                previousDir = PROJECT_DIR;
                PROJECT_DIR = path.join(PROJECT_DIR, 'NewProject');
                CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
                utils.getCleanProject(PROJECT_DIR, function() {
                    process.chdir(PROJECT_DIR);
                    utils.requireReload(
                        path.join(PROJECT_DIR, 'package.json')
                    );
                    manager.add({name: otherDecorator, 
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
                assert.notEqual(config.dependencies.decorators[otherDecorator], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.visualization.decoratorPaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            it('should add the relative path to the requirejsPaths webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig));

                assert.notEqual(config.requirejsPaths[otherDecorator], undefined);
                assert.notEqual(config.requirejsPaths[otherDecorator][0], '/');
            });

            describe('rm dependency decorator', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: otherDecorator}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.visualization.decoratorPaths.join(';');
                    assert.equal(paths.indexOf(otherDecorator), -1);
                });

                it('should remove decorator entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.decorators[otherDecorator], undefined);
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
            before(function(done) {
                this.timeout(5000);
                otherProject = path.join(__dirname, 'res', 'OtherProject');
                process.chdir(PROJECT_DIR);
                manager.add({name: OTHER_DECORATOR, 
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
                assert.notEqual(config.dependencies.decorators[OTHER_DECORATOR], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.visualization.decoratorPaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            describe('rm dependency decorator', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_DECORATOR}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                        paths = config.visualization.decoratorPaths.join(';');
                    assert.equal(paths.indexOf(OTHER_DECORATOR), -1);
                });

                it('should remove decorator entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.decorators[OTHER_DECORATOR], undefined);
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
