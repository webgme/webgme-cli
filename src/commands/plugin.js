/*globals define*/
/*
 * This file defines the commands and behavior for manipulating WebGME plugins
 */

define(['fs', 
        'ramda',
        'child_process',
        'rimraf',
        'path',
        'commands/shim/PluginGenerator'], 
        function(fs,
                 R,
                 childProcess,
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
    var spawn = childProcess.spawn;
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

                // Get the src, test paths
                var paths = R.mapObjIndexed(function(empty, type) {
                    return path.join(type, 'plugins', config.pluginID);
                }, {src: null, test: null});

                // Store the plugin info in the .webgme.json file
                var pluginConfig = {
                    srcPath: paths.src,
                    testPath: paths.test
                };
                var componentConfig = utils.getConfig();
                componentConfig.components.plugins[config.pluginID] = pluginConfig;
                utils.saveConfig(componentConfig);

                utils.updateWebGMEConfig();
                emitter.emit('write', 'Created new plugin at '+paths.src);

            },

            add: function(args) {
                var project,
                    pluginName,
                    pkgPath,
                    pkgContent,
                    pkg,
                    job;

                if (args._.length < 4) {
                    return emitter.emit('error', 
                        'Usage: webgme add plugin [project] [plugin]');
                }
                project = args._[2];
                pluginName = args._[3];
                // Add the project to the package.json
                // FIXME: Change this to support hashes
                var pkgProject = project.split('/').pop();

                // Add the plugin to the webgme config plugin paths
                // FIXME: Call this without --save then later save it
                job = spawn('npm', ['install', project, '--save'],
                    {cwd: utils.getRootPath()}); 

                job.on('close', function(code) {
                    if (code === 0) {  // Success!
                        // Look up the pluginPath
                        var otherConfig,
                            pluginPath,
                            config = utils.getConfig();

                        // Try to load the config of the new project
                        try {
                            otherConfig = utils.loadConfig(pkgProject);
                        } catch (e) {
                            emitter.emit('error', 'Did not recognize the project as a WebGME project');
                        }

                        // Verify that the plugin exists in the project
                        if (otherConfig.components[pluginName] === undefined) {
                            return emitter.emit('error', 'Project does not contain the plugin');
                        }
                        pluginPath = otherConfig.components[pluginName].srcPath;
                        config.dependencies[pluginName] = {
                            project: pkgProject,
                            path: pluginPath
                        };
                        utils.saveConfig(config);

                        // Update the webgme config file from 
                        // the cli's config
                        utils.updateWebGMEConfig();

                    } else {
                        emitter.emit('error', 'Could not find project!');
                    }
                });
            },

            rm: function(args) {
                // TODO: Check args
                // TODO: Add removing added plugins (remove entry from webgme.json and regen)
                var plugin = args._[2];
                var config = utils.getConfig();

                // Remove the plugin directories from src, test
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
                // The version is determined by the package.json version 
                // of the project
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
