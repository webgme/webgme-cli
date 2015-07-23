/*
 * This is the basic structure for component managers
 *
 * In the component manager, all public functions (functions not preceded by a _)
 * are assumed to be actions accepted from the command line.
 *
 * Note: "init" is a reserved action and cannot be used by the ComponentManager
 */

define(['rimraf',
        'path',
        'fs',
        'module',
        'commands/../utils'], function(rm_rf,
                                       path,
                                       fs,
                                       module,
                                       utils) {
    'use strict';

    var __dirname = path.dirname(module.uri);
    var ComponentManager = function(name, emitter) {
        this._emitter = emitter;
        this._name = name;
        this._prepareWebGmeConfig();
    };

    // TODO: Add methods for creating new objects, etc
    ComponentManager.prototype.rm = function(args, callback) {
        // TODO: Check args
        var plugin = args._[2],
            config = utils.getConfig(),
            type = config.components[this._name][plugin] ? 
                'components' : 'dependencies';

        // Remove from config files
        this._removeFromConfig(plugin, type);

        // Remove any actual files
        if (type === 'components') {
            // Remove the plugin directories from src, test
            var paths = Object.keys(config[type][this._name][plugin]),
                remaining = paths.length,
                finished = function() {
                    if (--remaining === 0) {
                        return callback();
                    }
                };
            paths.forEach(function(pathType) {
                var p = config[type][this._name][plugin][pathType];
                // Remove p recursively
                this._emitter.emit('info', 'Removing '+p);
                rm_rf(p, finished);
            }, this);
        } else {
            callback();
        }
    };

    ComponentManager.prototype._removeFromConfig = function(plugin, type) {
        var config = utils.getConfig();
        // Remove entry from the config
        delete config[type][this._name][plugin];
        utils.saveConfig(config);
        utils.updateWebGMEConfig();

        this._emitter.emit('write', 'Removed the '+plugin+'!');
    };

    /**
     * Get a resource from component's directory (ie, src/res/[name]).
     *
     * @param {String} name
     * @return {String}
     */
    ComponentManager.prototype._getResource = function(name) {
        var resourcePath = path.join(__dirname,'..','res',this._name,name);
        return fs.readFileSync(resourcePath, 'utf-8');
    };

    /**
     * Save a file to src/<type>/<name>/<name>.js
     *
     * @param {Object} opts
     * @return {undefined}
     */
    ComponentManager.prototype._saveFile = function(opts) {
        var type = opts.type || 'src',
            name = opts.name,
            filePath = path.join(utils.getRootPath(), type, this._name, 
                name, name+'.js');
        if (fs.existsSync(filePath)) {
            return this._emitter.emit('error', filePath+' already exists');
        }
        // Create the directories
        utils.saveFile({name: filePath, content: opts.content});
        return filePath;
    };

    /**
     * Add the names for components and dependencies
     * for this given component type
     *
     * @return {undefined}
     */
    ComponentManager.prototype._prepareWebGmeConfig = function() {
        // Check for project directory
        var projectHome = utils.getRootPath();
        if (projectHome !== null) {
            // Check for plugins entry in .webgme
            var config = utils.getConfig();
            var entries = Object.keys(config);
            entries.forEach(function(entry) {
                if (config[entry][this._name] === undefined) {
                    config[entry][this._name] = {};
                }
            }, this);
            utils.saveConfig(config);
        }
    };

    /**
     * Register the given component in the webgme-cli config
     *
     * @param {String} name
     * @param {Object} content
     * @return {undefined}
     */
    ComponentManager.prototype._register = function(name, content) {
        var config = utils.getConfig();
        config.components[this._name][name] = content;
        utils.saveConfig(config);
        utils.updateWebGMEConfig();
    };

    return ComponentManager;
});
