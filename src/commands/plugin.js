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
        'commands/shim/PluginGenerator',
        'commands/../GmeUtils'], 
        function(fs,
                 R,
                 _,
                 childProcess,
                 rm_rf,
                 path,
                 changeCase,
                 utils,
                 ComponentManager,
                 PluginGenerator,
                 GmeUtils) {

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
        ComponentManager.call(this, 'plugin', emitter);

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
            return path.join(type, 'plugin', config.pluginID);
        }, {src: null, test: null});

        // Store the plugin info in the .webgme.json file
        var pluginConfig = {
            srcPath: paths.src,
            testPath: paths.test
        };
        this._register(config.pluginID, pluginConfig);
        this._emitter.emit('write', 'Created new plugin at '+paths.src);
        callback();
    };

    PluginManager.prototype.new.options = PluginManager.prototype._getNewOptions();

    PluginManager.prototype.enable = function(args, callback) {
        // TODO: Add enabling plugins for projects
        if (args._.length < 4) {
            return this._emitter.emit('error',
            'Usage: webgme enable plugin [plugin] [project]');
        }

        var pluginName = args._[2],
            project = args._[3],
            branch = args.branch || 'master',
            gmeConfigPath = utils.getGMEConfigPath(),
            gmeConfig = nodeRequire(gmeConfigPath);

        GmeUtils.addToProject('validPlugins', pluginName, project, branch, gmeConfig,
        function(err) {
            if (err) {
                this._emitter.emit('error', 'Could not load WebGME project:',err);
                return callback(err);
            }

            // FIXME: Test this!
            this._emitter.emit('log', 'Added '+pluginName+' to '+project);
            callback(err);
        }.bind(this));

        //this._emitter.emit('error', 'Enabling plugins is currently not supported in the WebGME commandline interface.\nPlease enable the plugin using the WebGME.');
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
