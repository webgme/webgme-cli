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
  exists = require("exists-file"),
  rm_rf = require("rimraf"),
  fs = require("fs"),
  utils = require("./utils"),
  ComponentManager = require("./ComponentManager"),
  DecoratorGenerator = require("./shim/DecoratorGenerator"),
  Enableable = require("./mixins/Enableable/Enableable"),
  PluginHelpers = require("./shim/PluginHelpers"),
  metadata = require("webgme-engine/src/plugin/coreplugins/DecoratorGenerator/metadata.json"),
  RAW_CONFIG = metadata.configStructure;

var DecoratorManager = function (logger) {
  ComponentManager.call(this, "decorator", logger);
  Enableable.call(this, "validDecorators");
};

_.extend(
  DecoratorManager.prototype,
  ComponentManager.prototype,
  Enableable.prototype
);

/**
 * Functions to create the config flag from the WebGME's
 * DecoratorGenerator options. They are organized by type.
 *
 * @return {undefined}
 */
DecoratorManager.prototype._getOptions = function () {
  return RAW_CONFIG.map(function (config) {
    return PluginHelpers.getConfigValue[config.valueType](config);
  }).filter(function (opt) {
    return opt.name.indexOf("meta") === -1;
  });
};

/**
 * Create a new decorator
 *
 * @param args
 * @return {undefined}
 */
DecoratorManager.prototype.new = function (options, callback) {
  // Set the config options from the command line flags
  options.meta = false;
  options.decoratorName = options.decoratorName.replace(/Decorator$/, "");
  var self = this,
    decoratorGenerator = new DecoratorGenerator(this._logger, options),
    name = options.decoratorName,
    setupConfig;

  decoratorGenerator.main(function (e) {
    if (e) {
      return callback(e);
    }

    // Get the src, test paths
    var setupConfig = R.mapObjIndexed(
      function (empty, type) {
        return `${type}/decorators/${name}Decorator`;
      },
      { src: null }
    );

    // Store the decorator info in the webgme-setup.json file

    self._register(name + "Decorator", setupConfig);
    self._logger.write("Created new decorator at " + setupConfig.src);
    callback();
  });
};

DecoratorManager.prototype._getPathFromGME = function (installInfo) {
  var pkgProject = installInfo.pkg,
    gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase()),
    name = installInfo.name,
    componentPath,
    otherConfig;

  if (exists(gmeConfigPath)) {
    otherConfig = require(gmeConfigPath);
    componentPath = utils.getPathContaining(
      otherConfig.visualization.decoratorPaths.map(function (p) {
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

module.exports = DecoratorManager;
