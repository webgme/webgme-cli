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

var TMP_DIR = path.join(__dirname, '..', 'test-tmp');
var PROJECT_DIR = path.join(TMP_DIR, 'IssuesProject');
describe('Misc Issues', function() {

    before(function(done) {
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, function() {
                callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
            });
        } else {
            callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
        }
    });

    // issue 1
    describe('issue 1', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);
            callWebGME({_:['node', 'webgme', 'new', 'plugin', 'Plugin1']}, function() {
                callWebGME({_:['node', 'webgme', 'new', 'plugin', 'Plugin2']}, function() {
                    done();
                });
            });
        });

        it('should not create duplicate paths in gme config', function() {
            var gmeConfigPath = path.join(PROJECT_DIR, 'config.webgme.js'),
                gmeConfig = fs.readFileSync(gmeConfigPath, 'utf8'),
                pluginPaths = /"src\/plugin"/g;
            assert(gmeConfig.match(pluginPaths).length === 1);
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
