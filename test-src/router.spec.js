/*globals it,describe,before,after*/
var path = require('path'),
    utils = require('./res/utils'),
    assert = require('assert'),
    exists = require('exists-file'),
    nop = require('nop'),
    fse = require('fs-extra'),
    Logger = require('../lib/Logger'),
    RouterManager = require(__dirname+'/../lib/RouterManager'),
    rm_rf = require('rimraf'),
    _ = require('lodash');

var logger = new Logger(),
    manager = new RouterManager(logger),
    emitter = logger._emitter;

// Useful constants
var TMP_DIR = path.join(__dirname, '..', 'test-tmp'),
    WebGMEConfig = path.join('config', 'config.webgme.js'),
    PROJECT_DIR = path.join(TMP_DIR, 'ExampleRouterProject'),
    CONFIG_NAME = 'webgme-setup.json',
    CONFIG_PATH = path.join(PROJECT_DIR, CONFIG_NAME),
    OTHER_PROJECT = path.join(__dirname, 'res', 'OtherProject'),
    OTHER_ROUTER = 'OtherRouter',
    otherProject;

describe('Router tests', function() {
    'use strict';
    
    var ROUTER_NAME = 'MyRouter',
        RouterBasePath = path.join(PROJECT_DIR, 'src', 'routers'),
        ROUTER_SRC = path.join(RouterBasePath, ROUTER_NAME, ROUTER_NAME+'.js'),
        ROUTER_TEST = path.join(PROJECT_DIR, 'test', 'routers', ROUTER_NAME, ROUTER_NAME+'.spec.js');

    before(function(done) {
        utils.getCleanProject(PROJECT_DIR, () => {
            process.chdir(PROJECT_DIR);
            done();
        });
    });

    beforeEach(function() {
        if (exists(PROJECT_DIR)) {
            process.chdir(PROJECT_DIR);  // Start in different directory
        }
    });

    describe('mount router', function() {
        var mountPt = 'someMountPt/asdf';
        before(function(done) {
            manager.mount({name: ROUTER_NAME, mountPt: mountPt}, () => {
                utils.requireReload(
                    `${PROJECT_DIR}/config/config.webgme.js`,
                    `${PROJECT_DIR}/${CONFIG_NAME}`
                );
                done();
            });
        });

        it('should update the cli config', function() {
            var cliConfig = require(`${PROJECT_DIR}/${CONFIG_NAME}`),
                cliMountPt = cliConfig.components.routers[ROUTER_NAME].mount;
            
            console.log('router:', cliConfig.components.routers[ROUTER_NAME]);
            assert.equal(cliMountPt, mountPt);
        });

        it('should update the webgme config', function() {
            var gmeConfig = require(`${PROJECT_DIR}/config/config.webgme.js`);
            
            assert.notEqual(gmeConfig.rest.components[mountPt], undefined);
        });
    });

    describe('new router', function() {
        before(function(done) {
            process.chdir(PROJECT_DIR);  // Start in different directory
            manager.new({restRouterName: ROUTER_NAME}, done);
        });

        it('should create the router source file', function() {
            assert(fse.existsSync(ROUTER_SRC));
        });

        it('should be valid js', function() {
            var content = fse.readFileSync(ROUTER_SRC, 'utf8');
            assert(utils.isValidJs(content));
        });

        it('should not have desc (if none provided)', function() {
            var content = fse.readFileSync(ROUTER_SRC, 'utf8');
            assert.equal(content.indexOf('getDescription'), -1);
        });

        it('should set routerName to routerId by default', function() {
            var content = fse.readFileSync(ROUTER_SRC, 'utf8');
            assert.equal(content.indexOf('New Router'), -1);
        });

        it('should add the router (relative) path to the config file', function() {
            var config = require(path.join(PROJECT_DIR, WebGMEConfig));
            // check that basePath has been added!
            var relativeBase = RouterBasePath.replace(PROJECT_DIR+path.sep, '');
            assert.notEqual(Object.keys(config.rest.components).length, 0);
        });

        it('should record the router in webgme-setup.json', function() {
            var config = require(CONFIG_PATH);
            assert.notEqual(config.components.routers[ROUTER_NAME], undefined);
        });

        describe('2nd router', function() {
            var secondRouterName = 'ABrandNewRouter';
            before(function(done) {
                process.chdir(PROJECT_DIR);  // Start in different directory
                manager.new({restRouterName: secondRouterName}, done);
            });

            it('should have both dirs in src/routers', function() {
                [ROUTER_NAME, secondRouterName]
                    .map(function(name) {
                        return path.join(PROJECT_DIR, 'src', 'routers', name);
                    })
                    .forEach(function(routerPath) {
                        assert(fse.existsSync(routerPath));
                    });
            });
        });

        describe('list routers', function() {
            it('should list the new router', function(done) {
                manager.ls({}, function(err, routers) {
                    assert.notEqual(-1, routers.components.indexOf(ROUTER_NAME));
                    done();
                });
            });

            it('should not list routers in wrong directory ', function(done) {
                process.chdir(__dirname);
                manager.ls({}, function(err) {
                    assert(err);
                    process.chdir(PROJECT_DIR);
                    done();
                });
            });
        });
    });

    describe('rm router', function() {
        var ROUTER_NAME = 'RemoveMe';
        before(function(done) {
            process.chdir(PROJECT_DIR);
            manager.rm({name: 'MyRouter'}, done);
        });

        it('should remove router src directory', function() {
            var routerPath = path.join(PROJECT_DIR, 'src', 'routers', ROUTER_NAME);
            assert.equal(fse.existsSync(routerPath), false);
        });

        it('should remove router test directory', function() {
            var routerPath = path.join(PROJECT_DIR, 'test', 'routers', ROUTER_NAME);
            assert.equal(fse.existsSync(routerPath), false);
        });

        it('should remove router entry from '+CONFIG_NAME, function() {
            var config = require(CONFIG_PATH);
            assert.equal(config.components.routers[ROUTER_NAME], undefined);
        });
    });

    describe('import router', function() {

        describe('errors', function() {
            it('should not miss router or project', function(done) {
                emitter.once('error', done.bind(this, null));
                manager.import({name: OTHER_ROUTER}, nop);
            });
        });

        describe('projects created with webgme-setup-tool', function() {
            otherProject = path.join(__dirname, 'res', 'OtherProject');
            before(function(done) {
                this.timeout(5000);
                process.chdir(PROJECT_DIR);
                manager.import({name: OTHER_ROUTER, 
                             project: otherProject}, function() {

                    utils.requireReload(
                        path.join(PROJECT_DIR, 'package.json')
                    );
                    done();
                });
            });

            it('should add the project to the package.json', function() {
                var pkg = require(path.join(PROJECT_DIR, 'package.json')),
                depName = otherProject.split(path.sep).pop().toLowerCase();
                assert.notEqual(pkg.dependencies[depName], undefined);
            });

            it('should add the project to the '+CONFIG_NAME, function() {
                var configText = fse.readFileSync(CONFIG_PATH),
                    config = JSON.parse(configText);

                assert.notEqual(config.dependencies.routers[OTHER_ROUTER], undefined);
            });

            it('should add the path to the webgme config', function() {
                var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                paths = config.addOn.basePaths.join(';');
                assert.notEqual(paths.indexOf(otherProject.split(path.sep)[1]), -1);
            });

            describe('rm dependency router', function() {
                before(function(done) {
                    process.chdir(PROJECT_DIR);
                    manager.rm({name: OTHER_ROUTER}, done);
                });

                it('should remove the path from the webgme config', function() {
                    var config = require(path.join(PROJECT_DIR, WebGMEConfig)),
                    paths = config.addOn.basePaths.join(';');
                    assert.equal(paths.indexOf(OTHER_ROUTER), -1);
                });

                it('should remove router entry from '+CONFIG_NAME, function() {
                    var configText = fse.readFileSync(CONFIG_PATH),
                        config = JSON.parse(configText);
                    assert.equal(config.dependencies.routers[OTHER_ROUTER], undefined);
                });

                it.skip('should remove project from package.json', function() {
                    // TODO
                });

                it.skip('should not remove project from package.json if used', function() {
                    // TODO
                });
            });
        });
    });

    after(function(done) {
        if (fse.existsSync(PROJECT_DIR)) {
            rm_rf(PROJECT_DIR, done);
        } else {
            done();
        }
    });
});
