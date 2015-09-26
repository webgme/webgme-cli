/*globals define*/
/*
 * All functions not prepended with an '_' are considered actions callable
 * from the commandline. The name of the file is considered the name of the
 * item.
 */

'use strict';
var childProcess = require('child_process'),
    changeCase = require('change-case'),
    _ = require('lodash'),
    R = require('ramda'),
    path = require('path'),
    rm_rf = require('rimraf'),
    fs = require('fs'),
    utils = require('./utils'),
    ComponentManager = require('./ComponentManager'),
    PluginGenerator = require('./shim/PluginGenerator'),
    Enableable = require('./mixins/Enableable/Enableable'), 
    spawn = childProcess.spawn,
    RAW_CONFIG = PluginGenerator.prototype.getConfigStructure();

var CONFIG_FLAG_BY_TYPE = {
    boolean: function(config) {
        var nondefault = !config.value ? '' : 'no-';
        var desc = config.description || config.displayName;
        if (config.value) {
            desc = 'Don\'t '+changeCase.lowerCaseFirst(desc);
        }
        return {
            name: '--'+nondefault+changeCase.paramCase(config.name),
            type: 'boolean',
            desc: desc
        };
    },

    string: function(config) {
        return {
            name: '--'+changeCase.paramCase(config.name),
            type: 'string',
            items: config.valueItems,
            desc: config.description
        };
    }
};

var getConfigFlagForArgs = {
    string: function(config) {
        var rawFlag = CONFIG_FLAG_BY_TYPE.string(config).name;
        return rawFlag.replace(/^-[-]?/, '');
    }
};

var PluginManager = function(logger) {
    ComponentManager.call(this, 'plugin', logger);
    Enableable.call(this, 'validPlugins');
};

_.extend(PluginManager.prototype, ComponentManager.prototype,
    Enableable.prototype);

/**
 * Functions to create the config flag from the WebGME's 
 * PluginGenerator options. They are organized by type.
 *
 * @return {undefined}
 */
PluginManager.prototype._getNewOptions = function() {
    return RAW_CONFIG.map(function(config) {
        return CONFIG_FLAG_BY_TYPE[config.valueType](config);
    });
};

/**
 * Create a new plugin
 *
 * @param args
 * @return {undefined}
 */
PluginManager.prototype.new = function(options, callback) {
    // Set the config options from the command line flags
    var config = _.extend(this._getConfig(options), R.omit(['args'], options));
    var pluginGenerator = new PluginGenerator(this._logger, config);
    pluginGenerator.main();

    // Get the src, test paths
    var paths = R.mapObjIndexed(function(empty, type) {
        return path.join(type, 'plugins', config.pluginID);
    }, {src: null, test: null});

    // Store the plugin info in the webgme-setup.json file
    var pluginConfig = {
        src: paths.src,
        test: paths.test
    };
    this._register(config.pluginID, pluginConfig);
    this._logger.write('Created new plugin at '+paths.src);
    callback();
};

PluginManager.prototype.new.options = PluginManager.prototype._getNewOptions();

/**
 * Get the config for the plugin from the config structure and the command
 * line arguments.
 *
 * @param args
 * @param configStructure
 * @return {Object} config
 */
PluginManager.prototype._getConfig = function(args) {
    // Determine the commandline flag from the raw config
    var config = {},
        flag,
        type;

    for (var i = RAW_CONFIG.length; i--;) {
        // Retrieve values from plugin generator's config
        type = RAW_CONFIG[i].valueType;
        flag = RAW_CONFIG[i].name;

        // Set default
        config[RAW_CONFIG[i].name] = RAW_CONFIG[i].value;

        // Update if necessary
        if (getConfigFlagForArgs[type]) {
            flag = getConfigFlagForArgs[type](RAW_CONFIG[i]);
        } else {
        }
        if (args.hasOwnProperty(flag)) {
            config[RAW_CONFIG[i].name] = args[flag];
        }
    }
    return config;
};

module.exports = PluginManager;
