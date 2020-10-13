/*globals define*/
'use strict';

var TEST_FIXTURE_DIR = '../../globals',
    _ = require('lodash'),
    path = require('path'),
    utils = require('../utils'),
    PluginShim = require('./PluginShim'),
    requirejs = require('requirejs'),
    WebGMELayoutGenerator = requirejs('coreplugins/LayoutGenerator/LayoutGenerator');

var LayoutGenerator = function(logger, config) {
    // Load the LayoutGenerator from the core plugins
    // Use it to create the boilerplate for the new plugin
    WebGMELayoutGenerator.call(this);
    PluginShim.call(this, WebGMELayoutGenerator, logger, config);
};

_.extend(LayoutGenerator.prototype, PluginShim.prototype, WebGMELayoutGenerator.prototype);

// Helper function
var fixFilePath = function(file) {
    file.name = file.name.replace('client/js/Layouts', 'layouts');
};

// Make the src/plugins test/plugins directories as needed
LayoutGenerator.prototype.main = function(callback) {
    var self = this;
    WebGMELayoutGenerator.prototype.main.call(this, function(e, result) {
        if (e) {
            this.logger.error(e);
            return callback(e);
        }

        // Fix any file names
        Object.values(self.blobClient.artifacts).forEach(function(artifact) {
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

module.exports = LayoutGenerator;
