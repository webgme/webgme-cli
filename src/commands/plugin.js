/*globals define*/
/*
 * This file defines the commands and behavior for manipulating WebGME plugins
 */

define(['fs', 
        'ramda',
        'rimraf',
        'path',
        'commands/shim/PluginGenerator'], 
        function(fs,
                 R,
                 rm_rf,
                 path,
                 PluginGenerator) {

    'use strict';
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

    return function(emitter) {
        var commands = {
            new: function(args) {
                // Set the config options from the command line flags
                var config = _.extend(getConfig(args), {pluginID: args._[2]});
                var pluginGenerator = new PluginGenerator(emitter, config);
                pluginGenerator.main();
                var srcPluginPath = path.join('src', 'plugins', config.pluginID);
                var testPluginPath = path.join('test', 'plugins', config.pluginID);

                // Store the plugin info in the .webgme.json file
                var pluginConfig = {
                    srcPath: srcPluginPath,
                    testPath: testPluginPath
                };
                var componentConfig = utils.getConfig();
                componentConfig.components.plugins[config.pluginID] = pluginConfig;
                utils.saveConfig(componentConfig);

                emitter.emit('write', 'Created new plugin at '+srcPluginPath);
            },

            add: function(args) {
                var project = args._[2];
                var pluginName = args._[3];

                // Add the project to the package.json
                var pkgPath = path.join(utils.getRootPath(), 'package.json');
                var pkgContent = fs.readFileSync(pkgPath).toString();
                var pkg = JSON.parse(JSON.parse(pkgContent));  // FIXME
                // TODO: the projectname should match a regex
                pkg.dependencies[project.split('/')[1]] = project;
                fs.writeFileSync(pkgPath, JSON.stringify(pkg));

                // Add the plugin to the webgme config plugin paths
                // TODO

            },

            rm: function(args) {
                // TODO: Check args
                var plugin = args._[2];
                var config = utils.getConfig();

                // TODO: Remove the plugin directories from src, test
                var paths = Object.keys(config.components.plugins[plugin]);
                paths.forEach(function(pathType) {
                    var p = config.components.plugins[plugin][pathType];
                    // Remove p recursively
                    emitter.emit('info', 'Removing '+p);
                    rm_rf(p, utils.nop);
                });

                // Remove entry from the config
                delete config.components.plugins[plugin];
                utils.saveConfig(config);
                emitter.emit('write', 'Removed the '+plugin+'!');
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
            var entries = Object.keys(config);
            entries.forEach(function(entry) {
                if (config[entry].plugins === undefined) {
                    config[entry].plugins = {};
                }
            });
            utils.saveConfig(config);
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
