// DO NOT EDIT THIS FILE
// This file is automatically generated from the webgme-setup-tool.
'use strict';

var config = require('webgme/config/config.default'),
    validateConfig = require('webgme/config/validator');

// FIXME: This needs to be restructured...
// The paths can be loaded from the webgme-setup.json
<% if (typeof plugin === "undefined") plugin = []; %>

<% _.forEach(plugin, function(path) { %>
config.plugin.basePaths.push("<%= path %>");<%});%>

<% if (typeof addOn === "undefined") {%>
<% addOn = []; %>
<% } else { %>config.addOn.enable = true<%}%>
<% _.forEach(addOn, function(path) { %>
config.addOn.basePaths.push("<%= path %>");<%});%>

validateConfig(config);
module.exports = config;
