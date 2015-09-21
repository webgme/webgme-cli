/*globals describe,it,before,beforeEach,after*/
var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    testUtils = require('./res/utils'),
    utils = require('./../src/utils'),
    PluginManager = require(__dirname+'/../src/PluginManager'),
    _ = require('lodash');

var pluginManager = new PluginManager(),
    WebGMEConfig = 'config.webgme.js',
    TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    PROJECT_DIR = path.join(TMP_DIR, 'EnablableProject');

describe('enable/disable', function() {
    'use strict';

    var pluginName = 'NewPlugin';
    before(function(done) {
        testUtils.getCleanProject(PROJECT_DIR, done);
    });

    var called = false,
        mockPluginRunner = {
        run: function(gmeConfig, pluginConfig, opts, callback) {
            assert(gmeConfig);
            assert(pluginConfig);
            assert(opts);
            called = true;
            callback();
        }
    };

    describe('enable plugin', function() {
        it('should invoke pluginRunner.run', function(done) {
            called = false;
            pluginManager._pluginRunner = mockPluginRunner;
            pluginManager.enable({name: pluginName, project: 'dummyproject'}, function() {
                assert(called);
                done();
            });
        });

        it('should require "name" and "project"', function(done) {
            pluginManager.enable({project: 'dummyproject'}, function(err) {
                assert(err);
                done();
            });
        });
    });

    describe('disable plugin', function() {
        it('should invoke pluginRunner.run', function(done) {

            called = false;
            pluginManager._pluginRunner = mockPluginRunner;
            pluginManager.disable({name: pluginName, project: 'dummyproject'}, function() {
                assert(called);
                done();
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
