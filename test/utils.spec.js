/*globals describe,it,before,beforeEach,after*/
// TODO: Tests for utils
var rm_rf = require('rimraf'),
    path = require('path'),
    assert = require('assert'),
    fs = require('fs');


var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WORKING_DIR;
var WebGMEComponentManager = require('../src/WebGMEComponentManager');
var setupConfig = 'webgme-setup.json';
var webgmeManager = new WebGMEComponentManager();

describe('utils', function() {
    'use strict';

    describe('updateWebGMEConfig', function() {
        before(function(done) {
            WORKING_DIR = path.join(TMP_DIR, 'updateWebGMEConfig');
            fs.mkdirSync(WORKING_DIR);
            process.chdir(WORKING_DIR);
            webgmeManager.executeCommand({_: ['node', 'webgme', 'init']}, function() {
                // Change the config to use "\"
                var configPath = path.join(WORKING_DIR, setupConfig),
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                config.components = {
                    plugins: {
                        dummyPlugin: {src: 'src\\plugin'}  // Convert to use win32 path sep
                    }
                };
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                webgmeManager.invokeFromCommandLine(['node', 'webgme', 'new', 'plugin', 'blah'], done);
            });
        });

        it('should use "/" in webgme.config.js', function() {
            var config = require(path.join(WORKING_DIR, 'config'));
            assert.equal(config.plugin.basePaths.join(';').indexOf('\\'), -1);
        });

        it('should not have any empty basePaths', function() {
            var config = require(path.join(WORKING_DIR, 'config'));
            config.plugin.basePaths.forEach(function(basepath) {
                assert.notEqual(basepath, '');
            });
        });

        it('should use " rather than \' in paths', function() {
            var config = fs.readFileSync(path.join(WORKING_DIR, 'config', 'config.webgme.js'), 'utf8');
            assert.equal(config.indexOf('"'), -1);
        });
    });

    after(function(done) {
        rm_rf(TMP_DIR, done);
        
    });
});
