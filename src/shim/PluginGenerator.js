/*globals define*/
'use strict';

var TEST_FIXTURE_DIR = '../../globals',
    _ = require('lodash'),
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
    WebGMEPluginGenerator.prototype.main.call(this, (e, result) => {
        if (e) {
            this.logger.error(e);
            return callback(e);
        }

        // Fix any file names
        Object.values(this.blobClient.artifacts).forEach(artifact => {
            artifact.files.forEach(fixFilePath);
            // Fix the require path for the unit test
            const test = artifact.files
                .find(file => file.name.startsWith('test'));
            if (test) {  // If they are generating test file
                this.fixFixturePath(test);
            }

            artifact.files
                .forEach(file => this.logger.info(`Saving file at ${file.name}`));
        });

        // Save all BlobClient Artifacts to the fs
        utils.saveFilesFromBlobClient(this.blobClient);
        callback();
    });
};

module.exports = PluginGenerator;
