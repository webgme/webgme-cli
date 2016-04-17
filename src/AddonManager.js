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
    exists = require('exists-file'),
    ComponentManager = require('./ComponentManager'),
    AddonGenerator = require('./shim/AddonGenerator'),
    Enableable = require('./mixins/Enableable/Enableable'), 
    PluginHelpers = require('./shim/PluginHelpers'),
    metadata = require('webgme/src/plugin/coreplugins/AddOnGenerator/metadata.json'),
    RAW_CONFIG = metadata.configStructure;

var AddonManager = function(logger) {
    ComponentManager.call(this, 'addon', logger);
    Enableable.call(this, 'usedAddOns');
};

_.extend(AddonManager.prototype, ComponentManager.prototype,
    Enableable.prototype);

AddonManager.prototype._getOptions = function() {
    return RAW_CONFIG.map(function(config) {
        return PluginHelpers.getConfigValue[config.valueType](config);
    })
    .map(option => {
        option.name = option.name.replace(/.*name/g, '--name');
        return option;
    })
    .filter(option => option.name.indexOf('query-params') === -1);
};

AddonManager.prototype._parseConfig = function(options) {
    var config = PluginHelpers.getConfig(RAW_CONFIG, options);

    // If addOnName was not set in the options, set it to the addOnId
    config.addOnName = options.addOnName || options.addOnId;

    return config;
};


/**
 * Create a new addon
 *
 * @param args
 * @return {undefined}
 */
AddonManager.prototype.new = function(options, callback) {
    // Set the config options from the command line flags
    var self = this,
        config = this._parseConfig(options),
        addonGenerator = new AddonGenerator(this._logger, config),
        name = config.addOnName,
        setupConfig;

    addonGenerator.main(function(e) {
        if (e) {
            return callback(e);
        }

        // Get the src, test paths
        var setupConfig = R.mapObjIndexed(function(empty, type) {
            return path.join(type, 'addons', name);
        }, {src: null});

        // Store the addon info in the webgme-setup.json file

        self._register(name, setupConfig);
        self._logger.write('Created new addon at '+setupConfig.src);
        callback();
    });
};

AddonManager.prototype._getPathFromGME = function(installInfo) {
    var pkgProject = installInfo.pkg,
        gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase()),
        name = installInfo.name,
        componentPath,
        otherConfig;

    if (exists(gmeConfigPath)) {
        otherConfig = require(gmeConfigPath);
        componentPath = utils.getPathContaining(otherConfig.visualization.addonPaths.map(
        function(p) {
            if (!path.isAbsolute(p)) {
                return path.join(path.dirname(gmeConfigPath), p);
            }
            return p;
        }
        ), name);
        return componentPath !== null ? 
            path.join(componentPath, name) : null;
    }
    return null;
};

module.exports = AddonManager;
