/*globals describe,it,before,beforeEach,after*/
'use strict';

var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    Logger = require('../lib/Logger'),
    PluginManager = require('../lib/PluginManager'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new PluginManager(logger),
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
            manager['new']({ pluginID: 'Plugin1' }, function () {
                manager['new']({ pluginID: 'Plugin2' }, done);
            });
        });

        it('should not create duplicate paths in gme config', function () {
            var gmeConfigPath = path.join(PROJECT_DIR, WebGMEConfig),
                gmeConfig = fs.readFileSync(gmeConfigPath, 'utf8'),
                pluginPaths = /'src\/plugins'/g;
            assert(gmeConfig.match(pluginPaths).length === 1);
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