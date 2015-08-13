define(['coreplugins/PluginGenerator/PluginGenerator',
        'plugin/PluginBase',
        'commands/shim/blobClient',
        'commands/shim/logger',
        'ramda'], function(WebGMEPluginGenerator,
                           PluginBase,
                           BlobClient,
                           Logger,
                           R) {
    'use strict';
    
    var utils = require('./utils');
    var path = require('path');
    var _ = require('lodash');

    var PluginGenerator = function(emitter, config) {
        // Load the PluginGenerator from the core plugins
        // Use it to create the boilerplate for the new plugin
        WebGMEPluginGenerator.call(this);
        var blobClient = new BlobClient();
        this.initialize(new Logger(emitter), blobClient);
        this._currentConfig = config;
        this.emitter = emitter;
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
        file.name = file.name.replace('undefined'+path.sep, '');
        // Change "plugins" to "plugin"
        file.name = file.name.replace('plugins', 'plugin');
    };

    // Make the src/plugins test/plugins directories as needed
    PluginGenerator.prototype.main = function() {
        var self = this;
        WebGMEPluginGenerator.prototype.main.call(this, function(e, result) {
            if (e) {
                return this.emitter.emit('error', e);
            }

            // Fix any file names
            R.values(self.blobClient.artifacts).forEach(function(artifact) {
                artifact.files.forEach(fixFilePath);
                // Fix the require path for the unit test
                var test = artifact.files.filter(function(file) {
                    return file.name.indexOf('test') === 0;
                })[0];
                test.content = test.content.replace('../../../globals', 'webgme/test/_globals');

                artifact.files.forEach(function(file) {
                    self.emitter.emit('info', 'Saving file at '+file.name);
                });
            });

            // Save all BlobClient Artifacts to the fs
            utils.saveFilesFromBlobClient(self.blobClient);
        });
    };

    return PluginGenerator;
});
