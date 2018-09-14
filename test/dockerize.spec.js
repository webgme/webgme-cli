/*globals describe,it,before,after*/
var DockerizeManager = require('../src/DockerizeManager'),
    BaseManager = require('../src/BaseManager'),
    Logger = require('../src/Logger'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    _ = require('lodash'),
    rm_rf = require('rimraf'),
    utils = require(__dirname+'/res/utils'),
    nop = function(){};

var logger = new Logger(),
    manager = new DockerizeManager(logger),
    baseManager = new BaseManager(logger);

var WebGMEConfig = 'config.webgme.js',
    SETUP_CONFIG = 'webgme-setup.json';

var PROJECT_DIR,
    TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    TMP_PROJECT_DIR;

describe('DockerizeManager', function() {
    'use strict';

    before(function(done) {
        if (!fs.existsSync(TMP_DIR)) {
            fs.mkdir(TMP_DIR, function() {
                process.chdir(TMP_DIR);
                done();
            });
        } else {
            rm_rf(TMP_DIR, function() {
                fs.mkdir(TMP_DIR, function() {
                    process.chdir(TMP_DIR);
                    done();
                });
            });
        }
    });

    // Creating a new item from boilerplate
    describe('dockerize', function() {
        PROJECT_DIR = path.join(TMP_DIR, 'DockerizeInitProject');
        before(function(done) {
            utils.getCleanProject(PROJECT_DIR, done);
        });

        it('should create webgme project in current directory', function(done) {
            TMP_PROJECT_DIR = path.join(TMP_DIR, 'DockerizeNoOptions');
            fs.mkdirSync(TMP_PROJECT_DIR);
            process.chdir(TMP_PROJECT_DIR);
            baseManager.init({}, function() {
                var configPath = path.join(TMP_PROJECT_DIR, SETUP_CONFIG);
                assert(fs.existsSync(configPath));
                done();
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
});
