/*globals describe,it,before,after*/
var DockerizeManager = require('../src/DockerizeManager'),
    BaseManager = require('../src/BaseManager'),
    Logger = require('../src/Logger'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    _ = require('lodash'),
    rm_rf = require('rimraf'),
    exists = require('exists-file'),
    utils = require(__dirname + '/res/utils'),
    srcUtils = require('../src/utils'),
    nop = function () {
    };

var logger = new Logger(),
    manager = new DockerizeManager(logger),
    baseManager = new BaseManager(logger);

var WebGMEConfig = 'config.webgme.js',
    SETUP_CONFIG = 'webgme-setup.json';

var PROJECT_DIR,
    TMP_DIR = path.join(__dirname, '..', 'test-tmp');

describe('DockerizeManager', function () {
    'use strict';

    before(function (done) {
        if (!fs.existsSync(TMP_DIR)) {
            fs.mkdir(TMP_DIR, function () {
                process.chdir(TMP_DIR);
                done();
            });
        } else {
            rm_rf(TMP_DIR, function () {
                fs.mkdir(TMP_DIR, function () {
                    process.chdir(TMP_DIR);
                    done();
                });
            });
        }
    });

    // Creating a new item from boilerplate
    describe('dockerize', function () {
        let cnt = 0;

        beforeEach(function (done) {
            PROJECT_DIR = path.join(TMP_DIR, 'DockerizeProj' + cnt);
            fs.mkdirSync(PROJECT_DIR);
            process.chdir(PROJECT_DIR);
            baseManager.init({}, function () {
                var configPath = path.join(PROJECT_DIR, SETUP_CONFIG);
                assert(fs.existsSync(configPath));
                done();
            });
        });

        afterEach(function (done) {
            if (fs.existsSync(PROJECT_DIR)) {
                //rm_rf(PROJECT_DIR, done);
                done();
            } else {
                done();
            }

            cnt += 1;
        });

        it('should update package json with webgme-docker-worker-manager', function () {
            manager.dockerize({});
            var packageJSON = srcUtils.getPackageJSON(PROJECT_DIR);
            assert(typeof packageJSON.dependencies['webgme-docker-worker-manager'] === 'string',
                'Did not update package.json');
        });

        it('should generate the default file when no options given', function () {
            manager.dockerize({});
            [
                'Dockerfile',
                'DockerfilePluginWorker',
                './config/config.docker.js',
                'docker-compose.yml',
            ].forEach((fName) => assert(exists(path.join(PROJECT_DIR, fName)), `Did not generate ${fName}`));
        });

        it('should additionally generate prod files when --production is given', function () {
            manager.dockerize({production: true});
            [
                'Dockerfile',
                'DockerfilePluginWorker',
                './config/config.docker.js',
                'docker-compose.yml',
                // production
                'DockerfileNginx',
                './config/config.dockerprod.js',
                'docker-compose-prod.yml',
                'nginx.conf',
            ].forEach((fName) => assert(exists(path.join(PROJECT_DIR, fName)), `Did not generate ${fName}`));
        });

        it('should not overwrite existing files', function () {
            const fPath = path.join(PROJECT_DIR, 'Dockerfile');
            const dummyContent = 'Already here!';
            fs.writeFileSync(fPath, dummyContent);
            manager.dockerize({});
            assert(fs.readFileSync(fPath, 'utf-8') === dummyContent, 'Overwrote file!');
        });

        it('should overwrite existing files', function () {
            const fPath = path.join(PROJECT_DIR, 'Dockerfile');
            const dummyContent = 'Already here!';
            fs.writeFileSync(fPath, dummyContent);
            manager.dockerize({forceUpdate: true});
            assert(fs.readFileSync(fPath, 'utf-8') !== dummyContent, 'Did not overwrite file!');
        });
    });
});
