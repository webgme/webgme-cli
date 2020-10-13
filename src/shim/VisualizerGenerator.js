/*globals define*/
'use strict';

var _ = require('lodash'),
    path = require('path'),
    utils = require('../utils'),
    PluginShim = require('./PluginShim'),
    requirejs = require('requirejs'),
    WebGMEVisualizerGenerator;

utils.loadPaths(requirejs);
WebGMEVisualizerGenerator = requirejs('coreplugins/VisualizerGenerator/VisualizerGenerator');

var VisualizerGenerator = function(logger, config) {
    // Load the VisualizerGenerator from the core plugins
    // Use it to create the boilerplate for the new plugin
    WebGMEVisualizerGenerator.call(this);
    PluginShim.call(this, WebGMEVisualizerGenerator, logger, config);
};

_.extend(VisualizerGenerator.prototype, PluginShim.prototype, WebGMEVisualizerGenerator.prototype);

// Helper function
VisualizerGenerator.prototype._fixFilePaths = function(file) {
    file.name = file.name.replace(/^src\/client\/js\/Widgets/, 'src/visualizers/widgets');
    file.name = file.name.replace(/^src\/client\/js\/Panels/, 'src/visualizers/panels');
    // Replace the path to the widget if present
    var id = this.getCurrentConfig().visualizerID,
        widgetPath = 'js/Widgets/'+id+'/'+id+'Widget';

    file.content = file.content.replace(widgetPath, 'widgets/'+id+'/'+id+'Widget');
};

// Make the src/plugins test/plugins directories as needed
VisualizerGenerator.prototype.main = function(callback) {
    var self = this;
    WebGMEVisualizerGenerator.prototype.main.call(this, function(e, result) {
        if (e) {
            this.logger.error(e);
            return callback(e);
        }

        // Fix any file names
        Object.values(self.blobClient.artifacts).forEach(function(artifact) {
            artifact.files.forEach(self._fixFilePaths.bind(self));

            artifact.files.forEach(function(file) {
                self.logger.info('Saving file at '+file.name);
            });
        });

        // Save all BlobClient Artifacts to the fs
        utils.saveFilesFromBlobClient(self.blobClient);
        callback();
    });
};

module.exports = VisualizerGenerator;
