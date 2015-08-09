/*
 * This is for components that can be enabled or disabled by adding values to the 
 * root node
 *
 * eg, validPlugins, validAddons
 */
define([
    '../../../utils',
    './AddToPlugin/AddToPlugin',
    './RemoveFromPlugin/RemoveFromPlugin',
    'module',
    'path'
], function(
    utils,
    AddToRootPlugin,
    RemoveFromRootPlugin,
    module,
    path
) {
    'use strict';

    var nodeRequire = require.nodeRequire;
    var dirs = module.uri.split(path.sep);
    dirs.pop();
    var __dirname = dirs.join(path.sep);
    var PluginRunner = nodeRequire(__dirname+'/runPlugin');
    var Enableable = function(field) {
        this._field = field;
    };

    Enableable.prototype._invokePlugin = function(args, action, callback) {
        // TODO: Add enabling plugins for projects
        if (args._.length < 4) {
            return this._emitter.emit('error',
                'Usage: webgme '+action+' '+this._name+' ['+this._name+'] [project]');
        }

        var componentName = args._[2],
            project = args._[3],
            branch = args.branch || 'master',
            gmeConfigPath = utils.getGMEConfigPath(),
            gmeConfig = nodeRequire(gmeConfigPath),
            projectOpts,
            pluginConfig;

        // Add the AddToRootPlugin
        console.log('adding dirname:', __dirname);
        gmeConfig[this._name].basePaths.push(__dirname);
        // Create plugin config
        pluginConfig = {field: this._field, attribute: componentName};
        // Create project options
        projectOpts = {
            branch: branch,
            project: project,
            pluginName: action === 'enable' ? 'AddToPlugin' : 'RemoveFromPlugin',
            selectedObjID: '/1'
        };

        PluginRunner.run(gmeConfig, pluginConfig, projectOpts, callback);
    };

    Enableable.prototype.enable = function(args, callback) {
        this._invokePlugin(args, 'enable', function(err, result) {
            if (err) {
                this._emitter.emit('error', 'Could not load WebGME project:',err);
                return callback(err);
            }

            // FIXME: Test this!
            this._emitter.emit('log', 'Added '+args._[2]+' to '+args._[3]);
            callback(err);
        }.bind(this));
    };

    Enableable.prototype.disable = function(args, callback) {
        this._invokePlugin(args, 'disable', function(err, result) {
            if (err) {
                this._emitter.emit('error', 'Could not load WebGME project:',err);
                return callback(err);
            }

            // FIXME: Test this!
            this._emitter.emit('log', 'Added '+pluginName+' to '+project);
            callback(err);
        }.bind(this));
    };

    return Enableable;
});
