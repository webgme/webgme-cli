/*globals define*/
'use strict';

var _ = require('lodash'),
    R = require('ramda'),
    utils = require('../utils'),
    PluginShim = require('./PluginShim'),
    requirejs = require('requirejs'),
    WebGMEGenerator = requirejs('coreplugins/RestRouterGenerator/RestRouterGenerator');

var RouterGenerator = function(logger, config) {
    var cleanConfig = {};
    // Load the RouterGenerator from the core plugins
    // Use it to create the boilerplate for the new plugin
    WebGMEGenerator.call(this);

    // Remove circular references from the commander object
    Object.keys(config).filter(key => key[0] !== '_' && key !== 'args')
        .forEach(key => {
            cleanConfig[key] = config[key];
        });
    PluginShim.call(this, WebGMEGenerator, logger, cleanConfig);
};

_.extend(RouterGenerator.prototype, PluginShim.prototype, WebGMEGenerator.prototype);

// Helper function
var fixFilePath = function(routerName, file) {
    var isTestFile = /\.spec\.js$/,
        base = isTestFile.test(file.name) ? 'test' : 'src';

    file.name = `${base}/routers/${routerName}/${file.name}`;
};

// Make the src/plugins test/plugins directories as needed
RouterGenerator.prototype.main = function(callback) {
    var self = this,
        routerName = this.getCurrentConfig().restRouterName;

    WebGMEGenerator.prototype.main.call(this, function(e, result) {
        if (e) {
            this.logger.error(e);
            return callback(e);
        }

        // Fix any file names
        R.values(self.blobClient.artifacts).forEach(function(artifact) {
            artifact.files.forEach(function(file) {
                fixFilePath(routerName, file);
                self.logger.info('Saving file at '+file.name);
            });
        });

        // Save all BlobClient Artifacts to the fs
        utils.saveFilesFromBlobClient(self.blobClient);
        callback();
    });
};

module.exports = RouterGenerator;
