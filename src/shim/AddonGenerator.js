/*globals define*/
"use strict";

var TEST_FIXTURE_DIR = "../../globals",
  _ = require("lodash"),
  R = require("ramda"),
  path = require("path"),
  utils = require("../utils"),
  PluginShim = require("./PluginShim"),
  requirejs = require("requirejs"),
  WebGMEAddonGenerator = requirejs("coreplugins/AddOnGenerator/AddOnGenerator");

var AddonGenerator = function (logger, config) {
  // Load the AddonGenerator from the core plugins
  // Use it to create the boilerplate for the new plugin
  WebGMEAddonGenerator.call(this);
  PluginShim.call(this, WebGMEAddonGenerator, logger, config);
};

_.extend(
  AddonGenerator.prototype,
  PluginShim.prototype,
  WebGMEAddonGenerator.prototype
);

// Helper function
var fixFilePath = function (file) {
  file.name = file.name.replace("undefined/", "").replace(/addOn/g, "addon");
};

// Make the src/plugins test/plugins directories as needed
AddonGenerator.prototype.main = function (callback) {
  var self = this;
  WebGMEAddonGenerator.prototype.main.call(this, function (e, result) {
    if (e) {
      this.logger.error(e);
      return callback(e);
    }

    // Fix any file names
    R.values(self.blobClient.artifacts).forEach(function (artifact) {
      artifact.files.forEach(fixFilePath);
      artifact.files.forEach(function (file) {
        self.logger.info("Saving file at " + file.name);
      });
    });

    // Save all BlobClient Artifacts to the fs
    utils.saveFilesFromBlobClient(self.blobClient);
    callback();
  });
};

module.exports = AddonGenerator;
