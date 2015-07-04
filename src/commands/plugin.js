/*
 * This file defines the commands and behavior for manipulating WebGME plugins
 */

define(['fs', 
        'ramda',
        'commands/shim/PluginGenerator'], 
        function(fs,
                 R,
                 PluginGenerator) {

    /*
     * Generate the help messages from the plugin config structure.
     *
     * TODO
     */
    var changeCase = require('change-case');  // FIXME: Change this to requirejs
    var path = require('path');
    var _ = require('lodash');

    var utils = require('./utils');
    var rawConfig = PluginGenerator.prototype.getConfigStructure();
    var configFlagByType = {
        boolean: function(config) {
            var nondefault = !config.value ? '' : 'no-';
            var desc = 'Don\'t '+changeCase.lowerCaseFirst(config.description);
            return {
                name: '--'+nondefault+changeCase.paramCase(config.name),
                desc: desc
            };
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
    var getConfig = function(args) {
        // Determine the commandline flag from the raw config
        var config = {},
            defaultValue,
            flag,
            type;

        for (var i = rawConfig.length; i--;) {
            type = rawConfig[i].valueType;
            defaultValue = rawConfig[i].value;
            if (configFlagByType[type]) {
                flag = configFlagByType[type](rawConfig[i]);
            }
            config[rawConfig[i].name] = args[flag] || defaultValue;
        }
        return config;
    };

    return function(emitter) {
        return {
            name: 'plugin',
            cmds: {
                new: function(args) {
                    // First, verify that we are in a webgme project and 
                    // move to the project root
                    var projectHome = utils.getRootPath();
                    if (projectHome === null) {
                        return emitter.emit('error', 'Could not find a project in current or any parent directories');
                    }

                    process.chdir(projectHome);

                    // Set the config options from the command line flags
                    var config = _.extend(getConfig(args), {pluginID: args._[2]});
                    var pluginGenerator = new PluginGenerator(emitter, config);
                    pluginGenerator.main();
                    emitter.emit('write', 'New plugin...');
                },

                share: function(args) {
                    console.log('Sharing the plugin...');
                    // TODO: Add entry to webgme config file
                },

                add: function(args) {
                    console.log('Adding the plugin...');
                    // TODO: Retrieve the plugin from a git repo and add it to
                    // the webgme config file
                },

                rm: function(args) {
                    console.log('Removing the plugin...');
                    // TODO: Remove the plugin directories from src, test
                },

                update: function(args) {
                    console.log('Updating the plugin...');
                    // TODO
                }
            }
        };
    };
});
