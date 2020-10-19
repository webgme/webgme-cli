// This is a shim for WebGME plugins to shoehorn them into the setup tool.
"use strict";

var TEST_FIXTURE_DIR = "../../globals",
  BlobClient = require("./blobClient"),
  _ = require("lodash"),
  path = require("path"),
  utils = require("../utils"),
  R = require("ramda"),
  requirejs = require("requirejs");

utils.loadPaths(requirejs);
var PluginBase = requirejs("plugin/PluginBase");

var PluginShim = function (plugin, logger, config) {
  // Load the PluginShim from the core plugins
  // Use it to create the boilerplate for the new plugin
  var blobClient = new BlobClient();
  this.initialize(logger, blobClient, config);
  this._currentConfig = config;
  this.logger = logger;
  this.configure({});
  this.META = {};
};

_.extend(PluginShim.prototype, PluginBase.prototype);

PluginShim.prototype.initialize = function (logger, blob) {
  this.blobClient = blob;
  this.logger = logger;
};

PluginShim.prototype.fixFixturePath = function (file) {
  // Get the current path
  var regex = /testFixture = require\(['"]{1}(.*)['"]{1}\)/,
    oldPath = file.content.match(regex);

  file.content = file.content.replace(oldPath[1], TEST_FIXTURE_DIR);
};

module.exports = PluginShim;
