/*globals define*/
/*
 * All functions not prepended with an '_' are considered actions callable
 * from the commandline. The name of the file is considered the name of the
 * item.
 *
 * This convention is most important bc of the addition of a preprocessing
 * function to all these functions in the ComponentManager constructor.
 */

'use strict';
var _ = require('lodash'),
    R = require('ramda'),
    path = require('path'),
    rm_rf = require('rimraf'),
    fs = require('fs'),
    utils = require('./utils'),
    ComponentManager = require('./ComponentManager'),
    PluginGenerator = require('./shim/PluginGenerator'),
    PluginHelpers = require('./shim/PluginHelpers'),
    metadata = require('webgme/src/plugin/coreplugins/PluginGenerator/metadata.json'),
    RAW_CONFIG = metadata.configStructure;

var PluginManager = function(logger) {
    ComponentManager.call(this, 'plugin', logger);
};

_.extend(PluginManager.prototype, ComponentManager.prototype);

/**
 * Functions to create the config flag from the WebGME's 
 * PluginGenerator options. They are organized by type.
 *
 * @return {undefined}
 */
PluginManager.prototype._getOptions = function() {
    return RAW_CONFIG.map(function(config) {
        return PluginHelpers.getConfigValue[config.valueType](config);
    }).filter(function(opt) {
        return opt.name.indexOf('meta') === -1;
    });
};

PluginManager.prototype._parseConfig = function(options) {
    var config = PluginHelpers.getConfig(RAW_CONFIG, options);

    // We don't support the meta flag as we don't provide access to any project
    config.meta = false;

    // If pluginName was not set in the options, set it to the pluginId
    config.pluginName = options.pluginName || options.pluginID;

    return config;
};

/**
 * Create a new plugin
 *
 * @param args
 * @return {undefined}
 */
PluginManager.prototype.new = function(options, callback) {
    // Set the config options from the command line flags
    var self = this,
        config = this._parseConfig(options),
        pluginGenerator = new PluginGenerator(this._logger, config);

    pluginGenerator.main(function(e) {
        if (e) {
            return callback(e);
        }

        // Get the src, test paths
        var paths = R.mapObjIndexed(function(empty, type) {
            return `${type}/plugins/${config.pluginID}`;
        }, {src: null, test: null});

        // Store the plugin info in the webgme-setup.json file
        var pluginConfig = {
            src: paths.src,
            test: paths.test
        };
        self._register(config.pluginID, pluginConfig);
        self._logger.write('Created new plugin at '+paths.src);
        callback();
    });
};

module.exports = PluginManager;
