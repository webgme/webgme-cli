/*globals define*/
'use strict';

var TEST_FIXTURE_DIR = '../../globals',
    _ = require('lodash'),
    R = require('ramda'),
    path = require('path'),
    utils = require('../utils'),
    PluginShim = require('./PluginShim'),
    requirejs = require('requirejs'),
    WebGMEPluginGenerator = requirejs('coreplugins/PluginGenerator/PluginGenerator');

var PluginGenerator = function(logger, config) {
    // Load the PluginGenerator from the core plugins
    // Use it to create the boilerplate for the new plugin
    WebGMEPluginGenerator.call(this);
    PluginShim.call(this, WebGMEPluginGenerator, logger, config);
};

_.extend(PluginGenerator.prototype, PluginShim.prototype, WebGMEPluginGenerator.prototype);

// Helper function
var fixFilePath = function(file) {
    file.name = file.name.replace('undefined/', '');
};

// Make the src/plugins test/plugins directories as needed
PluginGenerator.prototype.main = function(callback) {
    var self = this;
    WebGMEPluginGenerator.prototype.main.call(this, function(e, result) {
        if (e) {
            self.logger.error(e);
            callback(e);
        }

        // Fix any file names
        R.values(self.blobClient.artifacts).forEach(function(artifact) {
            artifact.files.forEach(fixFilePath);
            // Fix the require path for the unit test
            var test = artifact.files.filter(function(file) {
                return file.name.indexOf('test') === 0;
            })[0];
            if (test) {  // If they are generating test file
                self.fixFixturePath(test);
            }

            artifact.files.forEach(function(file) {
                self.logger.info('Saving file at '+file.name);
            });
        });

        // Save all BlobClient Artifacts to the fs
        utils.saveFilesFromBlobClient(self.blobClient);
        callback();
    });
};

module.exports = PluginGenerator;
