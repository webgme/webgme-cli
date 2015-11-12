/*globals describe,it,before,beforeEach,after*/
'use strict';

var rm_rf = require('rimraf'),
    path = require('path'),
    assert = require('assert'),
    requirejs = require('requirejs'),
    utils = require('../src/utils'),
    testUtils = require('./res/utils'),
    fs = require('fs');

var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    PROJECT_DIR;
var setupConfig = 'webgme-setup.json';

describe('utils', function () {
    'use strict';

    describe('updateWebGMEConfig', function () {
        before(function (done) {
            PROJECT_DIR = path.join(TMP_DIR, 'updateWebGMEConfig');
            testUtils.getCleanProject(PROJECT_DIR, function () {
                // Change the config to use "\"
                var configPath = path.join(PROJECT_DIR, setupConfig),
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                config.components = {
                    plugins: {
                        dummyPlugin: { src: 'src\\plugin' } // Convert to use win32 path sep
                    }
                };
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                // Update the webgme config
                utils.updateWebGMEConfig();
                done();
            });
        });

        it('should use "/" in webgme.config.js', function () {
            var config = require(path.join(PROJECT_DIR, 'config'));
            assert.equal(config.plugin.basePaths.join(';').indexOf('\\'), -1);
        });

        it('should not have any empty basePaths', function () {
            var config = require(path.join(PROJECT_DIR, 'config'));
            config.plugin.basePaths.forEach(function (basepath) {
                assert.notEqual(basepath, '');
            });
        });

        it('should use \' rather than " in paths', function () {
            var config = fs.readFileSync(path.join(PROJECT_DIR, 'config', 'config.webgme.js'), 'utf8');
            assert.equal(config.indexOf('"'), -1);
        });
    });

    after(function (done) {
        rm_rf(TMP_DIR, done);
    });
});