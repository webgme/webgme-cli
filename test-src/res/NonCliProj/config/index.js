'use strict';

var config = require('webgme/config/config.default'),
    validateConfig = require('webgme/config/validator');

// Add/overwrite any additional settings here
// config.server.port = 8080;
// config.mongo.uri = mongodb://127.0.0.1:27017/webgme_my_app;
config.plugin.basePaths.push('plugins');
config.seedProjects.basePaths.push('./seeds');
config.addOn.enable = true
config.addOn.basePaths.push("addOn");

validateConfig(config);
module.exports = config;
