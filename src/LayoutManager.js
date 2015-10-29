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
    LayoutGenerator = require('./shim/LayoutGenerator'),
    PluginHelpers = require('./shim/PluginHelpers'),
    RAW_CONFIG = LayoutGenerator.prototype.getConfigStructure();

var LayoutManager = function(logger) {
    ComponentManager.call(this, 'layout', logger);
};

_.extend(LayoutManager.prototype, ComponentManager.prototype);

/**
 * Create a new layout
 *
 * @param args
 * @return {undefined}
 */
LayoutManager.prototype.new = function(options, callback) {
    // Set the config options from the command line flags
    var self = this,
        layoutGenerator = new LayoutGenerator(this._logger, options);

    layoutGenerator.main(function(e) {
        if (e) {
            return callback(e);
        }

        // Get the src, test paths
        var layoutConfig = R.mapObjIndexed(function(empty, type) {
            return path.join(type, 'layouts', options.layoutID);
        }, {src: null});

        // Store the layout info in the webgme-setup.json file
        self._register(options.layoutID, layoutConfig);
        self._logger.write('Created new layout at '+layoutConfig.src);
        callback();
    });
};

LayoutManager.prototype._getPathFromGME = function(installInfo) {
    var pkgProject = installInfo.pkg,
        gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase()),
        name = installInfo.name,
        componentPath,
        otherConfig;

    if (fs.existsSync(gmeConfigPath)) {
        otherConfig = require(gmeConfigPath);
        componentPath = utils.getPathContaining(otherConfig.visualization.layout.basePaths.map(
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
    return null
};

// TODO: Add enable/disable for Layouts (not the same as enableable as it is in
// the config rather than the project)

module.exports = LayoutManager;
