/*globals define*/
/*
 * This is for components that can be enabled or disabled by adding values to the
 * root node
 *
 * eg, validPlugins, validAddons
 */
"use strict";

var path = require("path"),
  utils = require("../../utils"),
  requirejs = require("requirejs");

var AddToRootPlugin, RemoveFromRootPlugin;

utils.loadPaths(requirejs);
AddToRootPlugin = requirejs(__dirname + "/AddToPlugin/AddToPlugin.js");
RemoveFromRootPlugin = requirejs(
  __dirname + "/RemoveFromPlugin/RemoveFromPlugin.js"
);

var Enableable = function (field) {
  this._field = field;
  this._pluginRunner = require(path.join(__dirname, "runPlugin"));
};

Enableable.prototype._invokePlugin = function (args, action, callback) {
  if (!(args.name && args.project)) {
    this._logger.error(
      "Usage: webgme " +
        action +
        " " +
        this._name +
        " [" +
        this._name +
        "] [project]"
    );
    return callback('Requires both "name" and "project" arguments');
  }

  var componentName = args.name, // TODO: verify that the plugin exists
    user = args.user || "guest",
    project = user + "+" + args.project,
    branch = args.branch || "master",
    gmeConfigPath = utils.getGMEConfigPath(),
    gmeConfig = require(gmeConfigPath),
    projectOpts,
    pluginConfig;

  // Add the AddToRootPlugin
  gmeConfig.plugin.basePaths.push(__dirname);
  // Create plugin config
  pluginConfig = { field: this._field, attribute: componentName };
  // Create project options
  projectOpts = {
    branch: branch,
    project: project,
    pluginName: action === "enable" ? "AddToPlugin" : "RemoveFromPlugin",
    selectedObjID: "/1",
  };

  this._pluginRunner.run(gmeConfig, pluginConfig, projectOpts, callback);
};

Enableable.prototype.enable = function (args, callback) {
  this._invokePlugin(
    args,
    "enable",
    function (err, result) {
      if (err) {
        this._logger.error("Could not load WebGME project:", err);
        return callback(err);
      }

      this._logger.write("Added " + args.name + " to " + args.project);
      callback(err);
    }.bind(this)
  );
};

Enableable.prototype.disable = function (args, callback) {
  this._invokePlugin(
    args,
    "disable",
    function (err, result) {
      if (err) {
        this._logger.error("Could not load WebGME project:", err);
        return callback(err);
      }

      this._logger.write("Disabled " + args.name + " in " + args.project);
      callback(err);
    }.bind(this)
  );
};

module.exports = Enableable;
