/*globals define*/
/*
 * All functions not prepended with an '_' are considered actions callable
 * from the commandline. The name of the file is considered the name of the
 * item.
 */

define(['fs', 
        'ramda',
        'lodash',
        'child_process',
        'rimraf',
        'path',
        'change-case',
        'commands/../utils',
        'commands/ComponentManager',
        'commands/shim/PluginGenerator'], 
        function(fs,
                 R,
                 _,
                 childProcess,
                 rm_rf,
                 path,
                 changeCase,
                 utils,
                 ComponentManager,
                 PluginGenerator) {

    'use strict';
    var spawn = childProcess.spawn;
    var RAW_CONFIG = PluginGenerator.prototype.getConfigStructure();
    var CONFIG_FLAG_BY_TYPE = {
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

    var PluginManager = function(emitter) {
        ComponentManager.call(this, emitter);

        // Add validation for external commands
        Object.keys(PluginManager.prototype)
            .filter(function(name) {return name.indexOf('_') !== 0;})
            .forEach(function(action) {
                this[action] = this._preprocess.bind(this, action);
        }, this);
    };

    _.extend(PluginManager.prototype, ComponentManager.prototype);

    /**
     * Functions to create the config flag from the WebGME's 
     * PluginGenerator options. They are organized by type.
     *
     * @return {undefined}
     */
    PluginManager.prototype._getNewOptions = function() {
        return RAW_CONFIG.map(function(config) {
            return CONFIG_FLAG_BY_TYPE[config.valueType](config);
        });
    };

    PluginManager.prototype._preprocess = function(action, args) {
        // Check for project directory
        var projectHome = utils.getRootPath();
        if (projectHome === null) {
            return this._emitter.emit('error', 'Could not find a project in current or any parent directories');
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
        PluginManager.prototype[action].call(this, args);
    };

    /**
     * Create a new plugin
     *
     * @param args
     * @return {undefined}
     */
    PluginManager.prototype.new = function(args) {
        // Set the config options from the command line flags
        var config = _.extend(this._getConfig(args), {pluginID: args._[2]});
        var pluginGenerator = new PluginGenerator(this._emitter, config);
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
        this._emitter.emit('write', 'Created new plugin at '+paths.src);

    };

    PluginManager.prototype.new.options = PluginManager.prototype._getNewOptions();

    PluginManager.prototype.add = function(args) {
        var project,
            pluginName,
            pkgPath,
            pkgContent,
            pkg,
            job;

        if (args._.length < 4) {
            return this._emitter.emit('error', 
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
                        this._emitter.emit('error', 'Did not recognize the project as a WebGME project');
                    }

                    // Verify that the plugin exists in the project
                    if (otherConfig.components[pluginName] === undefined) {
                        return this._emitter.emit('error', 'Project does not contain the plugin');
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
                    this._emitter.emit('error', 'Could not find project!');
                }
            });
    };

    PluginManager.prototype.rm = function(args) {
        // TODO: Check args
        // TODO: Add removing added plugins (remove entry from webgme.json and regen)
        var plugin = args._[2];
        var config = utils.getConfig();

        // Remove the plugin directories from src, test
        var paths = Object.keys(config.components.plugins[plugin]);
        paths.forEach(function(pathType) {
            var p = config.components.plugins[plugin][pathType];
            // Remove p recursively
            this._emitter.emit('info', 'Removing '+p);
            rm_rf(p, utils.nop);
        }, this);

        // Remove entry from the config
        delete config.components.plugins[plugin];
        utils.saveConfig(config);
        this._emitter.emit('write', 'Removed the '+plugin+'!');
    };

    /**
     * Get the config for the plugin from the config structure and the command
     * line arguments.
     *
     * @param args
     * @param configStructure
     * @return {Object} config
     */
    PluginManager.prototype._getConfig = function(args) {
        // Determine the commandline flag from the raw config
        var config = {},
            defaultValue,
            flag,
            type;

        for (var i = RAW_CONFIG.length; i--;) {
            type = RAW_CONFIG[i].valueType;
            defaultValue = RAW_CONFIG[i].value;
            if (CONFIG_FLAG_BY_TYPE[type]) {
                flag = CONFIG_FLAG_BY_TYPE[type](RAW_CONFIG[i]);
            }
            config[RAW_CONFIG[i].name] = args[flag] || defaultValue;
        }
        return config;
    };

    return PluginManager;
});
