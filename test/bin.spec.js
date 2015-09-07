// This tests the program as a child process to check the bin script
var spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    webgmeBinPath = path.join(__dirname, '..', 'bin', 'webgme');

describe('WebGME bin script', function() {
    before(function() {
        process.chdir(__dirname);
    });
    it('should parse and pass args to WebGMEComponentManager', function(done) {
        var webgmeBin = spawn(webgmeBinPath, ['--help']),
            helpMsg = fs.readFileSync(path.join(__dirname,'..','doc','help.txt'),'utf-8'),
            printedMsg = false;

        this.timeout(3000);  // FIXME: This shouldn't be so slow!
        webgmeBin.stdout.on('data', function(data) {
            printedMsg = true;
            var msg = data.toString();
            // Since helpMsg is a template, we will only compare the first
            // lines
            assert.equal(msg.split('\n')[0], helpMsg.split('\n')[0]);
        });

        webgmeBin.on('exit', function(code) {
            assert.equal(code,0);
            assert(printedMsg);
            done();
        });
    });

    it.skip('should exit with code 1 when encounters error', function(done) {
        //TODO
    });
});

var WebGMEComponentManager = require('../src/WebGMEComponentManager'),
    webgmeManager = new WebGMEComponentManager(),
    fs = require('fs'),
    emitter = webgmeManager.logger._emitter;

describe('WebGME command line parsing', function() {
    before(function(done) {
        fs.readFile(__dirname+'/../doc/help.txt', 'utf-8', 
            function(e, txt) {
                helpMsg = txt.split('\n')[0];
                done();
            }
        );
    });

    it('should correctly handle command line args', function(done) {
        emitter.once('write', function(msg) {
            assert.notEqual(msg.indexOf(helpMsg), -1);
            done();
        });
        webgmeManager.invokeFromCommandLine('node webgme -h -v'.split(' '));
    });
});
