/*globals it,describe,before,after*/
var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    nop = require('nop'),
    fse = require('fs-extra'),
    Logger = require('../src/Logger'),
    VizManager = require(__dirname+'/../src/VisualizerManager'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var logger = new Logger(),
    manager,
    emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleVizProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname, 'res', 'OtherProject'),
    OTHER_VIZ = 'OtherViz',
    otherProject;

describe('Viz tests', function() {
    'use strict';
    
    var VIZ_NAME = 'MyNewViz',
        VizBasePath = path.join(PROJECT_DIR, 'src', 'visualizers'),
        VIZ_SRC = path.join(VizBasePath, 'panels', VIZ_NAME, VIZ_NAME+'Panel.js');

    before(function(done) {
        utils.getCleanProject(PROJECT_DIR, function() {
            manager = new VizManager(logger);
            emitter = logger._emitter;
            done();
        });
    });

    describe('new viz options', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({name: 'hahaha', visualizerID: VIZ_NAME}, function() {
                utils.requireReload(path.join(VizBasePath, 'Visualizers.json'));
                done();
            });
        });

        it('should use the name option', function() {
            var jsonPath = path.join(VizBasePath, 'Visualizers.json'),
                visualizers = require(jsonPath),
                matching = visualizers.filter(function(viz) {
                    return viz.id === VIZ_NAME;
                });

            // check that basePath has been added!
            assert.equal(matching.length, 1);
            assert.equal(matching[0].title, 'hahaha');
        });

    });

    describe('new viz', function() {
        var NEW_VIZ = 'IAmNewAndUnique';
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({visualizerID: NEW_VIZ}, function() {
                utils.requireReload(path.join(VizBasePath, 'Visualizers.json'));
                done();
            });
        });

        it('should create the viz source file', function() {
            assert(fse.existsSync(VIZ_SRC));
        });

        it('should add panels and widgets to requirejsPaths', function() {
            var config = require(path.join(PROJECT_DIR, WebGMEConfig));
            assert.equal(config.requirejsPaths.widgets, './src/visualizers/widgets');
            assert.equal(config.requirejsPaths.panels, './src/visualizers/panels');
        });

        it('should add Visualizers.json to config.webgme.js', function() {
            var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                index = config.visualization.visualizerDescriptors
                    .indexOf('./src/visualizers/Visualizers.json');

            assert.notEqual(index, -1);
        });

        it('should add the viz (relative) path to the Visualizers.json', function() {
            var jsonPath = path.join(VizBasePath, 'Visualizers.json'),
                visualizers = require(jsonPath),
                matching = visualizers.filter(function(viz) {
                    return viz.id === NEW_VIZ;
                });

            // check that basePath has been added!
            assert.equal(matching.length, 1);
            assert.equal(matching[0].panel.indexOf('panels/'), 0);
        });

        it('should use the id for the name by default', function() {
            var jsonPath = path.join(VizBasePath, 'Visualizers.json'),
                visualizers = require(jsonPath),
                matching = visualizers.filter(function(viz) {
                    return viz.title === NEW_VIZ;
                });

            // check that basePath has been added!
            assert.equal(matching.length, 1);
            assert.equal(matching[0].panel.indexOf('panels/'), 0);
        });

        it('should have valid entry in the Visualizers.json', function() {
            var keys = ['id', 'title', 'panel', 'DEBUG_ONLY'],
                jsonPath = path.join(VizBasePath, 'Visualizers.json'),
                visualizers = require(jsonPath);

            visualizers.forEach(function(viz) {
                console.log('viz:', viz);
                keys.forEach(function(key) {
                    assert.notEqual(viz[key], undefined);
                });
            });
        });

        it('should record the viz in webgme-setup file', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.visualizers[NEW_VIZ], undefined);
        });

        it('should update the paths to the widget', function() {
            var panelPath = path.join(VizBasePath, 'panels', NEW_VIZ, NEW_VIZ+'Panel.js'),
                content = fse.readFileSync(panelPath, 'utf8'),
                defaultWidgetPath = 'js/Widgets/'+NEW_VIZ+'/'+NEW_VIZ+'Widget';

            assert.equal(content.indexOf(defaultWidgetPath), -1);
        });

        describe('2nd viz', function() {
            var secondVizName = 'ABrandNewViz',
                vizCount;

            before(function(done) {
                var jsonPath = path.join(PROJECT_DIR, 'src', 'visualizers', 'Visualizers.json'),
                    json = require(jsonPath);

                json.push({title: secondVizName, id: secondVizName});
                fse.writeFileSync(jsonPath, JSON.stringify(json));
                vizCount = json.length;

                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({visualizerID: secondVizName}, done);
            });

            describe('visualizers.json', function() {
                var json;
                before(function() {
                    var jsonPath = path.join(PROJECT_DIR, 'src', 'visualizers', 'Visualizers.json');
                    json = JSON.parse(fse.readFileSync(jsonPath, 'utf8'));
                });

                it('should not merge with existing vis w/ same title', function() {
                    assert.equal(json.length, vizCount+1);
                });

                it('should change it\'s id to avoid collisions', function() {
                    var matching = json.filter(function(entry) {
                        return entry.id === secondVizName;
                    });

                    assert.equal(matching.length, 1);
                });
            });

            it('should have both dirs in src/visualizers', function() {
                [NEW_VIZ, secondVizName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'visualizers', 'panels', name);
                    })
                    .forEach(function(vizPath) {
                        assert(fse.existsSync(vizPath));
                    });
            });
        });

        describe('list vizs', function() {
            it('should list the new viz', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(-1, msg.indexOf(NEW_VIZ));
                    done();
                });

                manager.ls({}, nop);
            });

            it('should not list vizs in wrong directory ', function(done) {
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

    describe('rm viz', function() {
        var VIZ_NAME = 'MyViz';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            manager.rm({name: VIZ_NAME}, function() {
                utils.requireReload(
                    path.join(VizBasePath, 'Visualizers.json'),
                    CONFIG_PATH
                );
                done();
            });
        });

        it('should remove viz panel directory', function() {
            var vizPath = path.join(PROJECT_DIR, 'src', 'visualizers', 'panels', VIZ_NAME);
            assert.equal(fse.existsSync(vizPath), false);
        });

        it('should remove viz widget directory', function() {
            var vizPath = path.join(PROJECT_DIR, 'src', 'visualizers', 'widgets', VIZ_NAME);
            assert.equal(fse.existsSync(vizPath), false);
        });

        it('should remove viz entry from '+CONFIG_NAME, function() {
            var config = require(CONFIG_PATH);
            assert.equal(config.components.visualizers[VIZ_NAME], undefined);
        });

        it('should remove viz entry from Visualizers.json', function() {
            var visJsonPath = path.join(VizBasePath, 'Visualizers.json'),
                visJson = require(visJsonPath);

            visJson.forEach(function(viz) {
                assert.notEqual(viz.id, VIZ_NAME);
            });
        });
    });

    describe('add viz', function() {

        describe('errors', function() {
            it('should not miss viz or project', function(done) {
                emitter.once('error', done.bind(this, null));
                manager.add({name: OTHER_VIZ}, nop);
            });

            // FIXME
            //it('should fail if project is missing viz', function(done) {
                //emitter.once('error', done.bind(this,null));
                //callWebGME({_: ['node', 'webgme', 'add', 'viz', 'blah', OTHER_PROJECT]});
            //});
        });

        describe('projects created with webgme-setup-tool', function() {
            otherProject = path.join(__dirname, 'res', 'OtherProject');
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                emitter.on('error', assert.bind(assert, false));
                manager.add({name: OTHER_VIZ, 
                             project: otherProject}, function() {

                    utils.requireReload(
                        path.join(PROJECT_DIR, WebGMEConfig),
                        CONFIG_PATH,
                        path.join(VizBasePath, 'Visualizers.json')
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
                var config = require(CONFIG_PATH);
                assert.notEqual(config.dependencies.visualizers[OTHER_VIZ], undefined);
            });

            it('should add the widget path to the requirejsPaths', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    depPath = config.requirejsPaths['widgets/'+OTHER_VIZ];

                assert.notEqual(depPath, undefined);
            });

            it('should add the panel path to the requirejsPaths', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    depPath = config.requirejsPaths['panels/'+OTHER_VIZ];

                assert.notEqual(depPath, undefined);
            });

            it('should use lowercase project in the requirejsPaths (panel)', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    depPath = config.requirejsPaths['panels/'+OTHER_VIZ],
                    project = depPath.split('/')[2];

                assert.equal(project, project.toLowerCase());
            });

            it('should use lowercase project in the requirejsPaths (widget)', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    depPath = config.requirejsPaths['widgets/'+OTHER_VIZ],
                    project = depPath.split('/')[2];

                assert.equal(project, project.toLowerCase(), 
                    'Project contains caps ('+project+')');
            });


            it('should add the panel path to the visualizers json', function() {
                var visJsonPath = path.join(VizBasePath, 'Visualizers.json'),
                    visJson = require(visJsonPath),
                    matching = visJson.filter(function(viz) {
                        return viz.id === OTHER_VIZ;
                    });

                assert.equal(matching.length, 1);
            });


            describe('rm dependency viz', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    utils.requireReload(
                        path.join(PROJECT_DIR, WebGMEConfig),
                        CONFIG_PATH
                    );
                    manager.rm({name: OTHER_VIZ}, done);
                });

                it('should remove the panels requirejspath', function() {
                    var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                        config = require(configPath),
                        depPath = config.requirejsPaths['panels/'+OTHER_VIZ];

                    assert.equal(depPath, undefined);
                });

                it('should remove the widgets requirejspath', function() {
                    var configPath = path.join(PROJECT_DIR, WebGMEConfig),
                        config = require(configPath),
                        depPath = config.requirejsPaths['widgets/'+OTHER_VIZ];

                    assert.equal(depPath, undefined);
                });

                it('should remove viz entry from '+CONFIG_NAME, function() {
                    var config = require(CONFIG_PATH);
                    assert.equal(config.dependencies.visualizers[OTHER_VIZ], undefined);
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
