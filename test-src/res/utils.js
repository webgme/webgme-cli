/* jshint node: true */
// Helpers for the tests
'use strict';

var fse = require('fs-extra'),
    rm_rf = require('rimraf'),
    esprima = require('esprima'),
    path = require('path');

var getCleanProject = function(projectDir, source, done) {
    var after,
        BaseProject;

    if (!done) {
        done = source;
        source = 'BasicProject';
    }

    BaseProject = path.join(__dirname, source);
    after = function() {
        process.chdir(projectDir);
        done();
    };

    if (fse.existsSync(projectDir)) {
        rm_rf(projectDir, function() {
            fse.copy(BaseProject, projectDir, after);
        });
    } else {
        fse.copy(BaseProject, projectDir, after);
    }
};

var isValidJs = function(text) {
    try {
        esprima.parse(text);
        return true;
    } catch (e) {
        return false;
    }
};

// Clear the require cache so the next load is correct
var requireReload = function() {
    var dep;
    for (var i = arguments.length; i--;) {
        dep = require.resolve(arguments[i]);
        delete require.cache[dep];
    }
};

module.exports = {
    getCleanProject: getCleanProject,
    isValidJs: isValidJs,
    requireReload: requireReload
};
