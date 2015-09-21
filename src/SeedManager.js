/*globals define*/
'use strict';

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    utils = require('./utils'),
    ComponentManager = require('./ComponentManager');

var SeedManager = function(logger) {
    ComponentManager.call(this, 'seed', logger);
    this._webgmeName = 'seedProjects';
};

_.extend(SeedManager.prototype, ComponentManager.prototype);

/**
 * Use the WebGME export script to dump the given project to a file.
 *
 * @param args
 * @param {Function} callback
 * @return {undefined}
 */
SeedManager.prototype.new = function(args, callback) {
    var gmeConfigPath = utils.getGMEConfigPath(),
        gmeConfig = require(gmeConfigPath),
        projectName = args.project,
        name = (args.seedName || projectName).replace(/\.js(on)?$/,''),
        source = args.source || 'master',  // branch or commit
        fileDir = path.join(this._getSaveLocation(),name),
        filePath = path.join(fileDir, name+'.json'),
        result;

    // This is lazily loaded because the load takes a couple seconds. This
    // causes a delay for calling 'new' but no other commands
    if (!this._exportProject) {
        var Exporter = require(__dirname+'/shim/export.js');
        this._exportProject = Exporter.run;
    }

    // Seeds have their own individual dirs to make sure that
    utils.mkdir(fileDir);
    this._logger.info('About to create a seed from '+source+' of '+
        projectName);

    this._exportProject({gmeConfig: gmeConfig,
                         projectName: projectName, 
                         source: source, 
                         outFile: filePath})
        .then(function() {
            this._logger.write('Created '+this._name+' at '+filePath);
            // Save the relative file dir
            fileDir = path.relative(utils.getRootPath(), fileDir);
            this._register(name, {src: fileDir});
            //this._register(name, {src: path.relative(__dirname, fileDir)});
            callback();
        }.bind(this))
        .fail(function(err) {
            this._logger.error('Could not create '+this._name+': '+err);
            fs.rmdirSync(fileDir);
            callback(err);
        }.bind(this));
};

SeedManager.prototype.new.options = [
    {
       name: 'name',
       desc: 'name for the new seed'
    },
    {
       name: 'source',
       desc: 'branch or commit to use'
    }
];

module.exports = SeedManager;
