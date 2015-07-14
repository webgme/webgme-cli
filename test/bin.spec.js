var spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    webgmeBinPath = path.join(__dirname, '..', 'bin', 'webgme');

describe('WebGME bin script', function() {
    it('should parse and pass args to WebGMEComponentManager', function(done) {
        var webgmeBin = spawn(webgmeBinPath, ['--help']),
            helpMsg = fs.readFileSync(path.join(__dirname,'..','doc','help.txt'),'utf-8'),
            printedMsg = false;

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
});
