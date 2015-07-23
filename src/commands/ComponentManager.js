/*
 * This is the basic structure for component managers
 *
 * In the component manager, all public functions (functions not preceded by a _)
 * are assumed to be actions accepted from the command line.
 *
 * Note: "init" is a reserved action and cannot be used by the ComponentManager
 */

define(['rimraf',
        'commands/../utils'], function(rm_rf,
                                       utils) {
    'use strict';

    var ComponentManager = function(name, emitter) {
        this._emitter = emitter;
        this._name = name;
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

    return ComponentManager;
});
