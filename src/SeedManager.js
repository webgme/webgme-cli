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
        branch = args.branch || 'master',  // branch or commit
        fileDir = path.join(this._getSaveLocation(),name),
        filePath = path.join(fileDir, name+'.zip'),
        user = args.user || null,
        result;

    // This is lazily loaded because the load takes a couple seconds. This
    // causes a delay for calling 'new' but no other commands
    if (!this._exportProject) {
        this._exportProject = require(__dirname+'/shim/export.js');
    }

    // Seeds have their own individual dirs to make sure that
    utils.mkdir(fileDir);
    this._logger.info(`About to create a seed from ${branch} of ${projectName}`);

    this._exportProject({gmeConfig, user, branch, projectName}, (err, data) => {
        // Save the data as <projectName>.zip in the filePath
                         //source: source, 
                         //outFile: filePath})
            if (err) {
                this._logger.error('Could not create '+this._name+': '+err);
                fs.rmdirSync(fileDir);
                return callback(err);
            }

            fs.writeFileSync(filePath, data);
            this._logger.write('Created '+this._name+' at '+filePath);
            // Save the relative file dir
            fileDir = path.relative(utils.getRootPath(), fileDir);
            fileDir = fileDir.replace(new RegExp(path.sep, 'g'), '/');
            this._register(name, {src: fileDir});
            callback();
        });
};

SeedManager.prototype.new.options = [
    {
       name: 'name',
       desc: 'name for the new seed'
    },
    {
       name: 'branch',
       desc: 'branch to use'
    }
];

module.exports = SeedManager;
