/* jshint node: true */
// Helpers for the tests
'use strict';

var fse = require('fs-extra'),
    rm_rf = require('rimraf'),
    path = require('path'),
    BASE_PROJECT = path.join(__dirname, 'BasicProject');

var getCleanProject = function(projectDir, done) {
    var after = function() {
        process.chdir(projectDir);
        done();
    };

    if (fse.existsSync(projectDir)) {
        rm_rf(projectDir, function() {
            fse.copy(BASE_PROJECT, projectDir, after);
        });
    } else {
        fse.copy(BASE_PROJECT, projectDir, after);
    }
};

module.exports = {
    getCleanProject: getCleanProject
};
