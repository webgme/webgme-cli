'use strict';

var path = require('path'),
    config = require('webgme/config/config.default'),
    validateConfig = require('webgme/config/validator');

// The paths can be loaded from the webgme-setup.json
config.plugin.basePaths.push(path.normalize(__dirname + "/../../src/mixins/Enableable"));
//config.addOn.basePaths.push("src/addOn");
//config.seedProjects.basePaths.push("src/seed/OtherSeed");
//config.seedProjects.basePaths.push("src/seed/alreadyExists");

config.addOn.enable = true;

validateConfig(config);
module.exports = config;