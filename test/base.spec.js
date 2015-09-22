/*globals describe,it,before,after*/
var WebGMEComponentManager = require('../src/WebGMEComponentManager'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    _ = require('lodash'),
    rm_rf = require('rimraf');

var emitter;
var WebGMEConfig = 'config.webgme.js',
    SETUP_CONFIG = 'webgme-setup.json';
var webgmeManager = new WebGMEComponentManager();

var callWebGME = function(args, callback) {
    'use strict';
    webgmeManager.executeCommand(_.extend({_: ['node', 'webgme']}, args), callback);
};

var PROJECT_DIR,
    TMP_DIR = path.join(__dirname, '..', 'test-tmp');

describe('WebGME-setup-tool', function() {
    'use strict';

    before(function() {
        process.chdir(__dirname);
        emitter = webgmeManager.logger._emitter;
        // sinon.spy(emitter, 'on');
    });

    describe('usage message', function() {
        var usageMsg;
        before(function(done) {
            fs.readFile(__dirname+'/../doc/usage.txt', 'utf-8', function(e, txt) {
                usageMsg = txt;
                done();
            });
        });

        it('should display the usage message if given invalid args', function(done) {
            emitter.once('write', function(msg) {
                assert.equal(msg, usageMsg);
                done();
            });
            callWebGME({_: ['node', 'webgme', 'INVALID', 'THING']});
        });
    });

    describe('basic flags', function() {

        describe('help', function() {
            var helpMsg, newHelpSnippet;
            before(function(done) {
                fs.readFile(__dirname+'/../doc/help.txt', 'utf-8', function(e, txt) {
                    helpMsg = txt.split('\n')[0];
                    // Load the help msg for new plugins
                    fs.readFile(__dirname+'/../doc/plugin/help.new.txt', 'utf-8', function(e, txt) {
                        newHelpSnippet = txt.split('\n')[0];
                        done();
                    });
                });
            });

            it('should log to console when given --help', function(done) {
                emitter.once('write', function(msg) {
                    done();
                });
                callWebGME({help: true});
            });

            it('should display help message when given --help', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(msg.indexOf(helpMsg), -1);
                    done();
                });
                callWebGME({help: true});
            });

            it('should display help message when given -h', function(done) {
                emitter.once('write', function(msg) {
                    assert.notEqual(msg.indexOf(helpMsg), -1);
                    done();
                });
                callWebGME({h: true});
            });

            describe('custom help messages', function() {
                var getMessage = function(type, action, item) {
                    item += item.length ? '/' : '';
                    action = action.length ? '.'+action : '';
                    return fs.readFileSync(__dirname+'/../doc/'+item+type+action+'.txt', 'utf-8');
                };

                it('should display help message for init', function(done) {
                    emitter.once('write', function(msg) {
                        // Since the new help message is a template, I am just checking the usage line
                        var helpSnippet = getMessage('help', 'init', '').split('\n')[0];
                        assert.notEqual(msg.indexOf(helpSnippet), -1);
                        done();
                    });
                    callWebGME({_: ['node', 'webgme', 'init'], help: true});
                });

                it('should display help message for "new plugin"', function(done) {
                    emitter.once('write', function(msg) {
                        // Since the new help message is a template, I am just checking the usage line
                        newHelpSnippet = getMessage('help', 'new', 'plugin').split('\n')[0];
                        assert.notEqual(msg.indexOf(newHelpSnippet), -1);
                        done();
                    });
                    callWebGME({_: ['node', 'webgme', 'new', 'plugin'], help: true});
                });
            });

            it('should display options for "new plugin --help"', function(done) {
                emitter.once('write', function(msg) {
                    // Since the new help message is a template, I am just checking the usage line
                    assert.notEqual(msg.indexOf("plugin-name"), -1);
                    done();
                });
                callWebGME({_: ['node', 'webgme', 'new', 'plugin'], help: true});
            });

        });

        describe('version', function() {
            var version;
            before(function() {
                version = require('../package.json').version;
            });

            it('should display correct version', function(done) {
                emitter.once('write', function(msg) {
                    assert.equal('v'+version, msg);
                    done();
                });
                callWebGME({version: true});
            });
        });

    });

    describe('verbose', function() {
        // TODO
    });

    // Creating a new item from boilerplate
    describe('basic commands', function() {
        PROJECT_DIR = path.join(TMP_DIR, 'ExampleProject');
        before(function(done) {
            // Create tmp directory in project root
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

        describe('init', function() {

            before(function(done) {
                process.chdir(TMP_DIR);
                callWebGME({_: ['node', 'webgme', 'init', PROJECT_DIR]}, function() {
                    process.chdir(PROJECT_DIR);
                    done();
                });
            });

            it('should create a new directory with project name', function() {
                assert(fs.existsSync(PROJECT_DIR));
            });

            it('should create (valid) globals test fixture', function() {
                var fixturePath = path.join(PROJECT_DIR, 'test', 'globals.js');
                assert(fs.existsSync(fixturePath));
            });

            it('should create a src and test dirs', function() {
                var res = ['src', 'test']
                    .map(function(dir) {
                        return path.join(PROJECT_DIR, dir);
                    })
                    .map(fs.existsSync)
                    .forEach(assert);
            });

            it('should create a .webgme file in project root', function() {
                assert(fs.existsSync(path.join(PROJECT_DIR, 'webgme-setup.json')));
            });

            it('should initialize an npm project', function() {
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                assert(fs.existsSync(packageJSON));
            });

            it('should name the npm project appropriately', function() {
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                var pkg = require(packageJSON);
                assert.equal(pkg.name, 'ExampleProject'.toLowerCase());
            });

            it('should add the webgme as a dependency', function() {
                var packageJSON = path.join(PROJECT_DIR, 'package.json');
                var deps = require(packageJSON).dependencies;
                assert(deps.hasOwnProperty('webgme'));
            });

            it.skip('should use the latest release of webgme', function() {
            });

            it('should create webgme app.js file', function() {
                var app = path.join(PROJECT_DIR, 'app.js');
                assert(fs.existsSync(app));
            });

            it('should throw error if no project name', function(done) {
                emitter.once('error', function(msg) {
                    done();
                });
                callWebGME({_: ['node', 'webgme', 'init']});
            });

            // issue 15
            it('should pretty printed webgme-setup.json', function() {
                var config = path.join(PROJECT_DIR, 'webgme-setup.json'),
                    content = fs.readFileSync(config, 'utf8');
                // Check that it is printed on multiple lines
                assert(content.split('\n').length > 3);
            });

            // WebGME config
            describe('WebGME config', function() {
                var CONFIG_DIR = path.join(PROJECT_DIR, 'config');

                it('should create config directory', function() {
                    assert(fs.existsSync(CONFIG_DIR));
                });

                it('should create a webgme config file', function() {
                    var config = path.join(CONFIG_DIR, WebGMEConfig);
                    assert(fs.existsSync(config));
                });

                it('should create editable (boilerplate) webgme config file', function() {
                    var config = path.join(CONFIG_DIR, 'config.default.js');
                    assert(fs.existsSync(config));
                });
            });
        });

        describe('init w/o args', function() {
            
            it('should create webgme project in current directory', function(done) {
                PROJECT_DIR = path.join(TMP_DIR, 'InitNoArgs');
                fs.mkdirSync(PROJECT_DIR);
                process.chdir(PROJECT_DIR);
                callWebGME({_: ['node', 'webgme', 'init']}, function() {
                    var configPath = path.join(PROJECT_DIR, SETUP_CONFIG);
                    assert(fs.existsSync(configPath));
                    done();
                });
            });

            it('should fail if dir is nonempty', function(done) {
                PROJECT_DIR = path.join(TMP_DIR, 'InitNoArgsFail');
                fs.mkdirSync(PROJECT_DIR);
                process.chdir(PROJECT_DIR);
                fs.writeFileSync(path.join(PROJECT_DIR, 'temp'), 'stuff');
                callWebGME({_: ['node', 'webgme', 'init']}, function(err) {
                    var configPath = path.join(PROJECT_DIR, SETUP_CONFIG);
                    assert(!fs.existsSync(configPath));
                    assert(!!err);
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
});