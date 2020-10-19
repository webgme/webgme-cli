/*globals define*/
/*
 * All functions not prepended with an '_' are considered actions callable
 * from the commandline. The name of the file is considered the name of the
 * item.
 *
 * This convention is most important bc of the addition of a preprocessing
 * function to all these functions in the ComponentManager constructor.
 */

"use strict";
var _ = require("lodash"),
  R = require("ramda"),
  path = require("path"),
  rm_rf = require("rimraf"),
  fs = require("fs"),
  utils = require("./utils"),
  exists = require("exists-file"),
  ComponentManager = require("./ComponentManager"),
  LayoutGenerator = require("./shim/LayoutGenerator"),
  PluginHelpers = require("./shim/PluginHelpers");

var LayoutManager = function (logger) {
  ComponentManager.call(this, "layout", logger);
};

_.extend(LayoutManager.prototype, ComponentManager.prototype);

/**
 * Create a new layout
 *
 * @param args
 * @return {undefined}
 */
LayoutManager.prototype.new = function (options, callback) {
  // Set the config options from the command line flags
  var self = this,
    layoutGenerator = new LayoutGenerator(this._logger, options);

  layoutGenerator.main(function (e) {
    if (e) {
      this._logger.error(e);
      return callback(e);
    }

    // Get the src, test paths
    var layoutConfig = R.mapObjIndexed(
      function (empty, type) {
        return `${type}/layouts/${options.layoutID}`;
      },
      { src: null }
    );

    // Store the layout info in the webgme-setup.json file
    self._register(options.layoutID, layoutConfig);
    self._logger.write("Created new layout at " + layoutConfig.src);
    callback();
  });
};

LayoutManager.prototype._getPathFromGME = function (installInfo) {
  var pkgProject = installInfo.pkg,
    gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase()),
    name = installInfo.name,
    componentPath,
    otherConfig;

  if (exists(gmeConfigPath)) {
    otherConfig = require(gmeConfigPath);
    componentPath = utils.getPathContaining(
      otherConfig.visualization.layout.basePaths.map(function (p) {
        if (!path.isAbsolute(p)) {
          return path.join(path.dirname(gmeConfigPath), p);
        }
        return p;
      }),
      name
    );
    return componentPath !== null ? path.join(componentPath, name) : null;
  }
  return null;
};

LayoutManager.prototype.enable = function (options, callback) {
  var name = options.name,
    config = utils.getConfig(),
    layoutType = null,
    types = Object.keys(config);

  // Get the layout type (component or dependency)
  layoutType = this._getInstanceType(name);

  // Verify that the layout exists
  if (!layoutType) {
    // If enabling the default layout in the project, just disable all others
    if (name === "DefaultLayout") {
      this._disableAll(config);
      utils.saveConfig(config);
      utils.updateWebGMEConfig();
      return callback(null);
    } else {
      let err = 'Layout "' + name + '" does not exist';
      this._logger.error(err);
      return callback(err);
    }
  }

  // Disable all other layouts
  this._disableAll(config);

  // Set the default layout in the webgme-setup.json
  config[layoutType].layouts[name].enabled = true;

  // Update config.webgme.js file
  utils.saveConfig(config);
  utils.updateWebGMEConfig();

  callback();
};

LayoutManager.prototype.disable = function (options, callback) {
  var name = options.name,
    layoutType = this._getInstanceType(name),
    config = utils.getConfig();

  // If the given layout exists and is enabled, we can just disable all layouts
  if (!layoutType) {
    let err = 'Layout "' + name + '" does not exist';
    if (name === "DefaultLayout") {
      err =
        'Cannot disable "DefaultLayout". Try enabling an alternative instead.';
    }
    this._logger.error(err);
    return callback(err);
  }

  if (!config[layoutType].layouts[name].enabled) {
    let err = 'Cannot disable "' + name + "\" - it isn't enabled!";
    this._logger.error(err);
    return callback(err);
  }

  this._disableAll(config);
  utils.saveConfig(config);
  utils.updateWebGMEConfig();
  callback(null);
};

LayoutManager.prototype._disableAll = function (config) {
  var types;
  config = config || utils.getConfig();
  types = Object.keys(config);
  types.forEach((type) => {
    var layouts = Object.keys(config[type].layouts);
    layouts.forEach((layout) => (config[type].layouts[layout].enabled = false));
  });
};

module.exports = LayoutManager;
