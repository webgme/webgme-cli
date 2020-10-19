"use strict";

var changeCase = require("change-case");

var getConfigValue = {
  boolean: function (config) {
    var nondefault = !config.value ? "" : "no-";
    var desc = config.description || config.displayName;
    if (config.value) {
      desc = "Don't " + changeCase.lowerCaseFirst(desc);
    }
    return {
      name: "--" + nondefault + changeCase.paramCase(config.name),
      type: "boolean",
      desc: desc,
    };
  },

  string: function (config) {
    return {
      name: "--" + changeCase.paramCase(config.name),
      type: "string",
      items: config.valueItems,
      desc: config.description,
    };
  },
};

var getConfigNameFromFlag = {
  string: function (config) {
    var rawFlag = getConfigValue.string(config).name;
    return rawFlag.replace(/^-[-]?/, "");
  },
};

/**
 * Get the config for the plugin from the config structure and the command
 * line arguments.
 *
 * @param args
 * @param configStructure
 * @return {Object} config
 */
var getConfig = function (rawConfig, args) {
  // Determine the commandline flag from the raw config
  var config = {},
    flag,
    type;

  for (var i = rawConfig.length; i--; ) {
    // Retrieve values from plugin generator's config
    type = rawConfig[i].valueType;
    flag = rawConfig[i].name;

    // Set default
    config[rawConfig[i].name] = rawConfig[i].value;

    // Update if necessary
    if (args.hasOwnProperty(flag) && typeof args[flag] !== "function") {
      config[rawConfig[i].name] = args[flag];
    }
  }
  return config;
};

module.exports = {
  getConfig: getConfig,
  getConfigValue: getConfigValue,
};
