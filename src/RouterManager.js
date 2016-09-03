/*globals define*/
/*
 * All functions not prepended with an '_' are considered actions callable
 * from the commandline. The name of the file is considered the name of the
 * item.
 *
 * This convention is most important bc of the addition of a preprocessing
 * function to all these functions in the ComponentManager constructor.
 *
 */

'use strict';
var _ = require('lodash'),
    R = require('ramda'),
    path = require('path'),
    exists = require('exists-file'),
    rm_rf = require('rimraf'),
    fs = require('fs'),
    utils = require('./utils'),
    ComponentManager = require('./ComponentManager'),
    RouterGenerator = require('./shim/RouterGenerator'),
    PluginHelpers = require('./shim/PluginHelpers'),
    metadata = require('webgme/src/plugin/coreplugins/RestRouterGenerator/metadata.json'),
    RAW_CONFIG = metadata.configStructure;

var RouterManager = function(logger) {
    ComponentManager.call(this, 'router', logger);
};

_.extend(RouterManager.prototype, ComponentManager.prototype);

/**
 * Functions to create the config flag from the WebGME's 
 * RouterGenerator options. They are organized by type.
 *
 * @return {undefined}
 */
RouterManager.prototype._getOptions = function() {
    return RAW_CONFIG.map(function(config) {
        return PluginHelpers.getConfigValue[config.valueType](config);
    });
};

/**
 * Create a new decorator
 *
 * @param args
 * @return {undefined}
 */
RouterManager.prototype.new = function(options, callback) {
    // Set the config options from the command line flags
    var self = this,
        generator = new RouterGenerator(this._logger, options),
        name = options.restRouterName,
        setupConfig;

    generator.main(function(e) {
        if (e) {
            return callback(e);
        }

        // Get the src, test paths
        setupConfig = {
            src: `src/routers/${name}`,
            mount: `routers/${name}`
        };

        self._register(name, setupConfig);
        self._logger.write(`Created new router at ${setupConfig.src}`);
        callback();
    });
};

RouterManager.prototype.mount = function(options, callback) {
    var config = utils.getConfig(),
        routerName = options.name,
        mountPt = options.mountPt,
        types = Object.keys(config),
        names,
        err,
        router;

    for (var i = types.length; i--;) {
        names = Object.keys(config[types[i]].routers);
        for (var n = names.length; n--;) {
            if (names[n] === routerName) {
                router = config[types[i]].routers[names[n]];
            } else if (config[types[i]].routers[names[n]].mount === mountPt) {
                err = `Mount point already in use by ${names[n]}`;
            }
        }
    }

    if (!router) {
        err = `"${routerName}" router not found.`;
    }

    if (err) {
        this._logger.error(err);
        return callback(err);
    }

    router.mount = mountPt;
    utils.saveConfig(config);
    utils.updateWebGMEConfig();
    return callback(null);
};

module.exports = RouterManager;
