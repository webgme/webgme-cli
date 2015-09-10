/*globals describe,it,before,beforeEach,after*/
var path = require('path'),
    assert = require('assert'),
    fs = require('fs'),
    rm_rf = require('rimraf'),
    sinon = require('sinon'),
    _ = require('lodash');

var WebGMEComponentManager = require('../src/WebGMEComponentManager'),
    WebGMEConfig = 'config.webgme.js',
    webgmeManager = new WebGMEComponentManager(),
    TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    PROJECT_DIR = path.join(TMP_DIR, 'EnablableProject');

describe('enable/disable', function() {
    'use strict';

    var pluginName = 'NewPlugin';
    before(function(done) {
        var next = function() {
            process.chdir(PROJECT_DIR);
            webgmeManager.executeCommand({
                _: ['node', 'webgme', 'new', 'plugin', pluginName]
            }, done);
        };
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, function() {
                webgmeManager.executeCommand({_:['node', 'webgme', 'init', PROJECT_DIR]}, next);
            });
        } else {
            webgmeManager.executeCommand({_:['node', 'webgme', 'init', PROJECT_DIR]}, next);
        }
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
            var pluginManager = webgmeManager.componentManagers.plugin;

            called = false;
            pluginManager._pluginRunner = mockPluginRunner;
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'enable', 'plugin', pluginName, 'dummyproject']
            }, function() {
                assert(called);
                done();
            });
        });
    });

    describe('disable plugin', function() {
        it('should invoke pluginRunner.run', function(done) {
            var pluginManager = webgmeManager.componentManagers.plugin;

            called = false;
            pluginManager._pluginRunner = mockPluginRunner;
            webgmeManager.executeCommandNoLoad({
                _: ['node', 'webgme', 'disable', 'plugin', pluginName, 'dummyproject']
            }, function() {
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
