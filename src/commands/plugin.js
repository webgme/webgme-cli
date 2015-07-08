/*
 * This file defines the commands and behavior for manipulating WebGME plugins
 */

define(['fs', 
        'ramda',
        'path',
        'commands/shim/PluginGenerator'], 
        function(fs,
                 R,
                 path,
                 PluginGenerator) {

    /*
     * Generate the help messages from the plugin config structure.
     *
     * TODO
     */
    var changeCase = require('change-case');  // FIXME: Change this to requirejs
    var _ = require('lodash');

    var utils = require('./utils');
    var rawConfig = PluginGenerator.prototype.getConfigStructure();
    var configFlagByType = {
        boolean: function(config) {
            var nondefault = !config.value ? '' : 'no-';
            var desc = config.description || config.displayName;
            if (config.value) {
                desc = 'Don\'t '+changeCase.lowerCaseFirst(desc);
            }
            return {
                name: '--'+nondefault+changeCase.paramCase(config.name),
                desc: desc
            };
        },

        string: function(config) {
            return {
                name: '--'+changeCase.paramCase(config.name),
                desc: config.description
            };
        }
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

    var defaultPlugin = {
        sharing: false,
        dependencies: []
    };

    return function(emitter) {
        var commands = {
            new: function(args) {
                // Set the config options from the command line flags
                var config = _.extend(getConfig(args), {pluginID: args._[2]});
                var pluginGenerator = new PluginGenerator(emitter, config);
                pluginGenerator.main();
                var pluginPath = path.join('src', 'plugins', config.pluginID);

                // Store the plugin info in the .webgme.json file
                var pluginConfig = _.extend({path: pluginPath}, defaultPlugin);
                var componentConfig = utils.getConfig();
                componentConfig.components.plugins[config.pluginID] = pluginConfig;
                utils.saveConfig(componentConfig);

                emitter.emit('write', 'Created new plugin at '+pluginPath);
            },

            share: function(args) {
                // Check args
                if (args._.length < 3) {
                    // TODO: Change this to a usage message
                    return emitter.emit('error', 'Missing plugin name');
                }

                // TODO: Get the plugin name
                var pluginName = args._[2];

                // Add entry to webgme config file
                // TODO
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
        };
        var preprocessor = function(action, args) {
            // Check for project directory
            var projectHome = utils.getRootPath();
            if (projectHome === null) {
                return emitter.emit('error', 'Could not find a project in current or any parent directories');
            }

            // Check for plugins entry in .webgme
            var config = utils.getConfig();
            if (config.components.plugins === undefined) {
                config.components.plugins = {};
                utils.saveConfig(config);
            }
            commands[action](args);
        };
        var pluginInfo = {
            name: 'plugin',
            cmds: {}
        };

        // Combine the preprocessor and the pluginInfo
        Object.keys(commands).forEach(function(action) {
            pluginInfo.cmds[action] = preprocessor.bind(null, action);
        });

        // Decorate the commands for the help messages
        pluginInfo.cmds.new.options = rawConfig.map(function(config) {
            return configFlagByType[config.valueType](config);
        });

        return pluginInfo;
    };
});
