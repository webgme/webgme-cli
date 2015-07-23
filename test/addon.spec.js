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
var PROJECT_DIR = path.join(TMP_DIR, 'ExampleAddOnProject');
var OTHER_PROJECT = __dirname+'/res/OtherProject';
var OTHER_ADDON = 'OtherAddOn';
describe.only('AddOn tests', function() {
    var ADDON_ID = 'MyNewAddOn',
        ADDON_NAME = 'NewAddOnName',
        AddOnBasePath = path.join(PROJECT_DIR, 'src', 'addon'),
        ADDON_SRC = path.join(AddOnBasePath, ADDON_ID, ADDON_ID+'.js'),
        ADDON_TEST = path.join(PROJECT_DIR, 'test', 'addon', ADDON_ID, ADDON_ID+'.spec.js');

    before(function(done) {
        if (fs.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, function() {
                callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
            });
        } else {
            callWebGME({_:['node', 'webgme', 'init', PROJECT_DIR]}, done);
        }
    });

    describe('new addon', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            callWebGME({
                _: ['node', 'webgme', 'new', 'addon', ADDON_NAME],
                id: ADDON_ID
            }, done);
        });

        it('should create the addon source file', function() {
            assert(fs.existsSync(ADDON_SRC));
        });

        it('should add the addon (relative) path to the config file', function() {
            var config = require(path.join(PROJECT_DIR, 'config.webgme.js'));
            // check that basePath has been added!
            var allBasePaths = config.addOn.basePaths.join(';');
            assert.notEqual(allBasePaths.indexOf(ADDON_ID), -1);
        });

        it('should record the addon in .webgme file', function() {
            var config = require(path.join(PROJECT_DIR,'.webgme.json'));
            assert.notEqual(config.components.addon[ADDON_ID], undefined);
        });

        it('should enable addons in the webgme config', function() {
            var config = require(path.join(PROJECT_DIR, 'config.webgme.js'));
            assert(config.addOn.enable);
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
