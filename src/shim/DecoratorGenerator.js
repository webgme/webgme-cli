/*globals define*/
'use strict';

var _ = require('lodash'),
    utils = require('../utils'),
    PluginShim = require('./PluginShim'),
    requirejs = require('requirejs'),
    WebGMEDecoratorGenerator = requirejs('coreplugins/DecoratorGenerator/DecoratorGenerator');

var DecoratorGenerator = function(logger, config) {
    // Load the DecoratorGenerator from the core plugins
    // Use it to create the boilerplate for the new plugin
    WebGMEDecoratorGenerator.call(this);
    PluginShim.call(this, WebGMEDecoratorGenerator, logger, config);
};

_.extend(DecoratorGenerator.prototype, PluginShim.prototype, WebGMEDecoratorGenerator.prototype);

// Helper function
var fixFilePath = function(file) {
    file.name = 'src/decorators/'+file.name;
};

// Make the src/plugins test/plugins directories as needed
DecoratorGenerator.prototype.main = function(callback) {
    var self = this;
    WebGMEDecoratorGenerator.prototype.main.call(this, function(e, result) {
        if (e) {
            this.logger.error(e);
            return callback(e);
        }

        // Fix any file names
        Object.values(self.blobClient.artifacts).forEach(function(artifact) {
            artifact.files.forEach(fixFilePath);
            artifact.files.forEach(function(file) {
                self.logger.info('Saving file at '+file.name);
            });
        });

        // Save all BlobClient Artifacts to the fs
        utils.saveFilesFromBlobClient(self.blobClient);
        callback();
    });
};

module.exports = DecoratorGenerator;
