/*globals define*/
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
    var Enableable = function(field) {
        this._field = field;
        this._pluginRunner = nodeRequire(__dirname+'/runPlugin');
    };

    Enableable.prototype._invokePlugin = function(args, action, callback) {
        if (args._.length < 4) {
            return this._logger.error('Usage: webgme '+action+' '+
                this._name+' ['+this._name+'] [project]');
        }

        var componentName = args._[2],  // TODO: verify that the plugin exists
            user = args.user || 'guest',
            project = user+'+'+args._[3],
            branch = args.branch || 'master',
            gmeConfigPath = utils.getGMEConfigPath(),
            gmeConfig = nodeRequire(gmeConfigPath),
            projectOpts,
            pluginConfig;

        // Add the AddToRootPlugin
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

        this._pluginRunner.run(gmeConfig, pluginConfig, projectOpts, callback);
    };

    Enableable.prototype.enable = function(args, callback) {
        this._invokePlugin(args, 'enable', function(err, result) {
            if (err) {
                this._logger.error('Could not load WebGME project:',err);
                return callback(err);
            }

            this._logger.write('Added '+args._[2]+' to '+args._[3]);
            callback(err);
        }.bind(this));
    };

    Enableable.prototype.disable = function(args, callback) {
        this._invokePlugin(args, 'disable', function(err, result) {
            if (err) {
                this._logger.error('Could not load WebGME project:',err);
                return callback(err);
            }

            this._logger.write('Added '+args._[2]+' to '+args._[3]);
            callback(err);
        }.bind(this));
    };

    return Enableable;
});
