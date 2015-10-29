/*globals it,describe,before,after*/
var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    nop = require('nop'),
    fse = require('fs-extra'),
    Logger = require('../src/Logger'),
    LayoutManager = require(__dirname+'/../src/LayoutManager'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new LayoutManager(logger),
    emitter = logger._emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleLayoutProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname, 'res', 'OtherProject'),
    OTHER_LAYOUT = 'OtherLayout',
    otherProject;

describe('Layout tests', function() {
    'use strict';
    
    var LAYOUT_NAME = 'MyNewLayout',
        LayoutBasePath = path.join(PROJECT_DIR, 'src', 'layouts'),
        LAYOUT_SRC = path.join(LayoutBasePath, LAYOUT_NAME, LAYOUT_NAME+'.js'),
        LAYOUT_TEST = path.join(PROJECT_DIR, 'test', 'layouts', LAYOUT_NAME, LAYOUT_NAME+'.spec.js');

    before(function(done) {
        utils.getCleanProject(PROJECT_DIR, done);
    });

    describe('new layout', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({layoutID: LAYOUT_NAME}, done);
        });

        it('should create the layout source file', function() {
            assert(fse.existsSync(LAYOUT_SRC));
        });

        it('should create the layout config file', function() {
            var configPath = path.join(LayoutBasePath, LAYOUT_NAME, LAYOUT_NAME+'Config.json');
            assert(fse.existsSync(configPath));
        });

        it('should create the layout html file', function() {
            var htmlPath = path.join(LayoutBasePath, LAYOUT_NAME, 
                'templates', LAYOUT_NAME+'.html');
            assert(fse.existsSync(htmlPath));
        });
        it('should be valid js', function() {
            var content = fse.readFileSync(LAYOUT_SRC, 'utf8');
            assert(utils.isValidJs(content));
        });

        it('should not have desc (if none provided)', function() {
            var content = fse.readFileSync(LAYOUT_SRC, 'utf8');
            assert.equal(content.indexOf('getDescription'), -1);
        });

        it('should add the layout (relative) path to the config file', function() {
            var config = require(path.join(PROJECT_DIR, WebGMEConfig));
            // check that basePath has been added!
            var relativeBase = LayoutBasePath.replace(PROJECT_DIR+path.sep, '');
            assert.notEqual(config.visualization.layout.basePaths.indexOf(relativeBase), -1);
        });

        it('should record the layout in webgme-setup.json', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.layouts[LAYOUT_NAME], undefined);
        });

        describe('2nd layout', function() {
            var secondLayoutName = 'ABrandNewLayout';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({layoutID: secondLayoutName}, done);
            });

            it('should have both dirs in src/layouts', function() {
                [LAYOUT_NAME, secondLayoutName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'layouts', name);
                    })
                    .forEach(function(layoutPath) {
                        assert(fse.existsSync(layoutPath), layoutPath + ' doesn\'t exist!');
                    });
            });
        });

        describe('list layouts', function() {
            it('should list the new layout', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(-1, msg.indexOf(LAYOUT_NAME));
                    done();
                });

                manager.ls({}, nop);
            });

            it('should not list layouts in wrong directory ', function(done) {
                process.chdir(__dirname);
                manager.ls({}, function(err) {
                    assert(err);
                    process.chdir(PROJECT_DIR);
                    done();
                });
            });
        });
    });

    describe('rm layout', function() {
        var LAYOUT_NAME = 'RemoveMe';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            manager.rm({name: 'MyLayout'}, done);
        });

        it('should remove layout src directory', function() {
            var layoutPath = path.join(PROJECT_DIR, 'src', 'layouts', LAYOUT_NAME);
            assert.equal(fse.existsSync(layoutPath), false);
        });

        it('should remove layout test directory', function() {
            var layoutPath = path.join(PROJECT_DIR, 'test', 'layouts', LAYOUT_NAME);
            assert.equal(fse.existsSync(layoutPath), false);
        });

        it('should remove layout entry from '+CONFIG_NAME, function() {
            var config = require(CONFIG_PATH);
            assert.equal(config.components.layouts[LAYOUT_NAME], undefined);
        });
    });

    describe('add layout', function() {

        describe('errors', function() {
            it('should not miss layout or project', function(done) {
                emitter.once('error', done.bind(this, null));
                manager.add({name: OTHER_LAYOUT}, nop);
            });

            // FIXME
            //it('should fail if project is missing layout', function(done) {
                //emitter.once('error', done.bind(this,null));
                //callWebGME({_: ['node', 'webgme', 'add', 'layout', 'blah', OTHER_PROJECT]});
            //});
        });

        describe('projects NOT created with webgme-setup-tool', function() {
            var previousDir, oldConfigPath;
            before(function(done) {
                this.timeout(10000);
                oldConfigPath = CONFIG_PATH;
                previousDir = PROJECT_DIR;

                otherProject = path.join(__dirname, 'res', 'NonCliProj');
                PROJECT_DIR = path.join(PROJECT_DIR, 'NewProject');
                CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
                utils.getCleanProject(PROJECT_DIR, function() {
                    process.chdir(PROJECT_DIR);
                    emitter.on('error', assert.bind(assert, false));
                    manager.add({name: 'DefaultLayout', 
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
                assert.notEqual(config.dependencies.layouts.DefaultLayout, undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.visualization.layout.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            it('should add the relative path to the requirejsPaths webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig));

                assert.notEqual(config.requirejsPaths.DefaultLayout, undefined);
                assert.notEqual(config.requirejsPaths.DefaultLayout[0], '/');
            });

            describe('rm dependency layout', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: 'DefaultLayout'}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.visualization.layout.basePaths.join(';');
                    assert.equal(paths.indexOf('DefaultLayout'), -1);
                });

                it('should remove layout entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.layouts.DefaultLayout, undefined);
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
                emitter.on('error', assert.bind(assert, false));
                manager.add({name: OTHER_LAYOUT, 
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
                assert.notEqual(config.dependencies.layouts[OTHER_LAYOUT], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.visualization.layout.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            describe('rm dependency layout', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_LAYOUT}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.visualization.layout.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_LAYOUT), -1);
                });

                it('should remove layout entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.layouts[OTHER_LAYOUT], undefined);
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

    describe('enable layout', function() {
        it.skip('should set the default in the config.webgme.js', function() {
        });

        it.skip('should only set one webgme-setup.json entry to "enabled"', function() {
        });
    });

    describe('disable layout', function() {
        it.skip('should remove the default attributes in the config.webgme.js', function() {
        });
        // TODO
    });

    after(function(done) {
        if (fse.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, done);
        } else {
            done();
        }
    });
});
