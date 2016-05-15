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
    exists = require('exists-file'),
    rm_rf = require('rimraf'),
    fs = require('fs'),
    childProcess = require('child_process'),
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

    pluginGenerator.main(e => {
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
        this._register(config.pluginID, pluginConfig);
        this._logger.write('Created new plugin at '+paths.src);
        // If templates were generated, run `combine_templates`
        this._combineTemplates(paths.src, callback);
    });
};

PluginManager.prototype._combineTemplates = function(srcPath, callback) {
    var root = utils.getRootPath(),
        scriptDir = path.join(root, srcPath, 'Templates'),
        scriptPath = path.join(scriptDir, 'combine_templates.js'),
        job;

    if (exists(scriptPath)) {
        job = childProcess.fork(scriptPath, [], {
            cwd: scriptDir,
            silent: true
        });
        this._logger.write('running "combine_templates"...');
        this._logger.writeStream(job.stdout);
        this._logger.errorStream(job.stderr);

        job.on('close', code => {
            var err = null;
            if (code !== 0) {  // Failure...
                err = `Could not combine templates for plugin`;
                this._logger.error(err);
            }
            callback(err);
        });
    } else {
        callback(null);
    }
};

module.exports = PluginManager;
