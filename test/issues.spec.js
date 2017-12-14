/*globals describe,it,before,beforeEach,after*/
'use strict';

var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    exists = require('exists-file'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    Logger = require('../lib/Logger'),
    PluginManager = require('../lib/PluginManager'),
    VizManager = require('../lib/VisualizerManager'),
    _ = require('lodash');

var logger = new Logger(),
    manager = {
    plugin: new PluginManager(logger),
    viz: new VizManager(logger)
},
    emitter = logger._emitter;

var WebGMEConfig = path.join('config', 'config.webgme.js');
var TMP_DIR = path.join(__dirname, '..', 'test-tmp');
var PROJECT_DIR = path.join(TMP_DIR, 'IssuesProject');
describe('Misc Issues', function () {
    'use strict';

    before(function (done) {
        utils.getCleanProject(PROJECT_DIR, done);
    });

    // issue 1
    describe('issue 1', function () {
        before(function (done) {
            process.chdir(PROJECT_DIR);
            manager.plugin['new']({ pluginID: 'Plugin1' }, function () {
                manager.plugin['new']({ pluginID: 'Plugin2' }, done);
            });
        });

        it('should not create duplicate paths in gme config', function () {
            var gmeConfigPath = path.join(PROJECT_DIR, WebGMEConfig),
                gmeConfig = fs.readFileSync(gmeConfigPath, 'utf8'),
                pluginPaths = /src\/plugins'/g;
            assert(gmeConfig.match(pluginPaths).length === 1);
        });
    });

    // import --dev
    describe('import --dev', function () {
        var OTHER_PLUGIN = 'OtherPlugin',
            otherProject = path.join(__dirname, 'res', 'NonCliProj');

        before(function (done) {
            process.chdir(PROJECT_DIR);
            manager.plugin['import']({
                name: OTHER_PLUGIN,
                project: otherProject,
                dev: true
            }, function () {
                utils.requireReload(path.join(PROJECT_DIR, 'package.json'));
                done();
            });
        });

        it('should add project to devDependencies', function () {
            var pkgJsonPath = path.join(PROJECT_DIR, 'package.json'),
                pkgJson = require(pkgJsonPath);

            assert(pkgJson.devDependencies.noncliproj);
        });
    });

    describe('issue 129', function () {
        var OTHER_VIZ = 'Secondary',
            otherProject = path.join(__dirname, 'res', 'OtherProject');

        before(function (done) {
            utils.getCleanProject(PROJECT_DIR, 'EmptyProject', function () {
                manager.viz['import']({ name: OTHER_VIZ,
                    project: otherProject }, done);
            });
        });

        // issue 129
        it('should create empty Visualizers.json', function () {
            var vizjson = require(PROJECT_DIR + '/src/visualizers/Visualizers.json');
            assert.equal(vizjson.length, 0);
        });
    });

    // issue 173
    describe('action from non-project-root', function () {
        var pluginName = 'Plugin173',
            projConfigPath = path.join(PROJECT_DIR, 'webgme-setup.json');

        before(function (done) {
            process.chdir(path.join(PROJECT_DIR, 'src'));
            manager.plugin['new']({
                pluginID: pluginName
            }, function (err) {
                assert(!err, err);
                utils.requireReload(projConfigPath);
                done();
            });
        });

        it('should create new plugin from non-project-root', function () {
            var projConfig = require(projConfigPath),
                relPath = projConfig.components.plugins[pluginName].src,
                pluginPath = path.join(PROJECT_DIR, relPath);

            assert(exists(pluginPath));
        });
    });

    describe('win32 compatibility', function () {

        it('should convert \\ to /', function (done) {
            var plugin = new PluginManager(logger);

            plugin._getPathFromCliConfig = function () {
                return '.\\src\\plugins\\TestPlugin\\TestPlugin.js';
            };
            plugin._getPathFromDependency({}, function (err, dir) {
                assert(!err);
                assert.equal(dir.indexOf('\\'), -1);
                done();
            });
        });
    });

    after(function (done) {
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, done);
        } else {
            done();
        }
    });
});