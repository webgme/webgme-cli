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
    var nodeRequire = require.nodeRequire;
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
        var options;
        Object.keys(PluginManager.prototype)
            .filter(function(name) {return name.indexOf('_') !== 0;})
            .forEach(function(action) {
                this[action] = this._preprocess.bind(this, action);
                // Copy over any options, etc
                options = Object.keys(PluginManager.prototype[action]);
                for (var i = options.length; i--;) {
                    this[action][options[i]] = PluginManager.prototype[action][options[i]];
                }
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

    PluginManager.prototype._preprocess = function(action, args, callback) {
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
        PluginManager.prototype[action].call(this, args, callback);
    };

    /**
     * Create a new plugin
     *
     * @param args
     * @return {undefined}
     */
    PluginManager.prototype.new = function(args, callback) {
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
        callback();
    };

    PluginManager.prototype.new.options = PluginManager.prototype._getNewOptions();

    PluginManager.prototype.add = function(args, callback) {
        var project,
            pluginName,
            pkgPath,
            pkgContent,
            projectRoot = utils.getRootPath(),
            pkg,
            job;

        if (args._.length < 4) {
            return this._emitter.emit('error', 
            'Usage: webgme add plugin [plugin] [project]');
        }
        pluginName = args._[2];
        project = args._[3];
        // Add the project to the package.json
        // FIXME: Change this to support hashes
        var pkgProject = project.split('/').pop();

        // Add the plugin to the webgme config plugin paths
        // FIXME: Call this without --save then later save it
        job = spawn('npm', ['install', project, '--save'],
            {cwd: projectRoot}); 

        this._emitter.emit('info', 'npm install '+project+' --save');
        job.stdout.on('data', utils.logStream.bind(null, this._emitter, 'info'));
        job.stderr.on('data', utils.logStream.bind(null, this._emitter, 'info'));

        job.on('close', function(code) {
            this._emitter.emit('info', 'npm exited with: '+code);
            if (code === 0) {  // Success!
                // Look up the pluginPath by trying to load the config of 
                // the new project or find the plugin through the plugin 
                // paths defined in the config.js
                var otherConfig,
                    pluginPath = null,
                    config = utils.getConfig(),
                    gmeCliConfigPath = utils.getConfigPath(pkgProject.toLowerCase()),
                    gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase());

                if (fs.existsSync(gmeCliConfigPath)) {
                    otherConfig = JSON.parse(fs.readFileSync(gmeCliConfigPath, 'utf-8'));
                    if (otherConfig.components.plugins[pluginName]) {
                        pluginPath = otherConfig.components.plugins[pluginName].srcPath;
                    }
                } else if (fs.existsSync(gmeConfigPath)) {
                    otherConfig = nodeRequire(gmeConfigPath);
                    pluginPath = utils.getPathContaining(otherConfig.plugin.basePaths.map(
                    function(p) {
                        return path.join(path.dirname(gmeConfigPath), p);
                    }
                    ), pluginName);
                    pluginPath = path.join(pluginPath,pluginName);
                } else {
                    this._emitter.emit('error', 'Did not recognize the project as a WebGME project');
                }

                // Verify that the plugin exists in the project
                if (pluginPath === null) {
                    return this._emitter.emit('error', 'Project does not contain the plugin');
                }
                pluginPath = path.relative(projectRoot, pluginPath);
                config.dependencies.plugins[pluginName] = {
                    project: pkgProject,
                    path: pluginPath
                };
                utils.saveConfig(config);

                // Update the webgme config file from 
                // the cli's config
                utils.updateWebGMEConfig();
                callback();

            } else {
                this._emitter.emit('error', 'Could not find project!');
            }
        }.bind(this));
    };

    PluginManager.prototype.rm = function(args, callback) {
        // TODO: Check args
        var plugin = args._[2],
            config = utils.getConfig(),
            type = config.components.plugins[plugin] ? 
                'components' : 'dependencies';

        // Remove from config files
        this._removeFromConfig(plugin, type);

        // Remove any actual files
        if (type === 'components') {
            // Remove the plugin directories from src, test
            var paths = Object.keys(config[type].plugins[plugin]),
                remaining = paths.length,
                finished = function() {
                    if (--remaining === 0) {
                        return callback();
                    }
                };
            paths.forEach(function(pathType) {
                var p = config[type].plugins[plugin][pathType];
                // Remove p recursively
                this._emitter.emit('info', 'Removing '+p);
                rm_rf(p, finished);
            }, this);
        } else {
            callback();
        }
    };

    PluginManager.prototype._removeFromConfig = function(plugin, type) {
        var config = utils.getConfig();
        // Remove entry from the config
        delete config[type].plugins[plugin];
        utils.saveConfig(config);
        utils.updateWebGMEConfig();

        this._emitter.emit('write', 'Removed the '+plugin+'!');
    };

    PluginManager.prototype.enable = function(args, callback) {
        // TODO: Add enabling plugins for projects
        this._emitter.emit('error', 'Enabling plugins is currently not supported in the WebGME commandline interface.\nPlease enable the plugin using the WebGME.');
    };

    PluginManager.prototype.disable = function(args, callback) {
        // TODO: Add disabling plugins for projects
        this._emitter.emit('error', 'Disabling plugins is currently not supported in the WebGME commandline interface.\nPlease disable the plugin using the WebGME.');
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
