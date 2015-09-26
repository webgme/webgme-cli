/*globals define*/
'use strict';

var TEST_FIXTURE_DIR = '../../globals',
    BlobClient = require('./blobClient'),
    _ = require('lodash'),
    path = require('path'),
    utils = require('../utils'),
    R = require('ramda'),
    requirejs = require('requirejs');

utils.loadPaths(requirejs);
var WebGMEPluginGenerator = requirejs('coreplugins/PluginGenerator/PluginGenerator'),
    PluginBase = requirejs('plugin/PluginBase');

var PluginGenerator = function(logger, config) {
    // Load the PluginGenerator from the core plugins
    // Use it to create the boilerplate for the new plugin
    WebGMEPluginGenerator.call(this);
    var blobClient = new BlobClient();
    this.initialize(logger, blobClient);
    this._currentConfig = config;
    this.logger = logger;
    this.configure({});
    this.META = {};
};

_.extend(PluginGenerator.prototype, 
    PluginBase.prototype,
    WebGMEPluginGenerator.prototype);

PluginGenerator.prototype.initialize = function(logger, blob) {
    this.blobClient = blob;
    this.logger = logger;
};

// Helper function for the PluginGenerator
var fixFilePath = function(file) {
    file.name = file.name.replace('undefined/', '');
};

var fixFixturePath = function(file) {
    // Get the current path
    var regex = /testFixture = require\(['"]{1}(.*)['"]{1}\)/,
        oldPath = file.content.match(regex);

    file.content = file.content.replace(oldPath[1], TEST_FIXTURE_DIR);
};


// Make the src/plugins test/plugins directories as needed
PluginGenerator.prototype.main = function() {
    var self = this;
    WebGMEPluginGenerator.prototype.main.call(this, function(e, result) {
        if (e) {
            return this.logger.error(e);
        }

        // Fix any file names
        R.values(self.blobClient.artifacts).forEach(function(artifact) {
            artifact.files.forEach(fixFilePath);
            // Fix the require path for the unit test
            var test = artifact.files.filter(function(file) {
                return file.name.indexOf('test') === 0;
            })[0];
            if (test) {  // If they are generating test file
                fixFixturePath(test);
            }

            artifact.files.forEach(function(file) {
                self.logger.info('Saving file at '+file.name);
            });
        });

        // Save all BlobClient Artifacts to the fs
        utils.saveFilesFromBlobClient(self.blobClient);
    });
};

module.exports = PluginGenerator;
