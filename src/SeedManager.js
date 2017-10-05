/*globals define*/
'use strict';

var path = require('path'),
    fse = require('fs-extra'),
    exists = require('exists-file'),
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
        filePath = path.join(fileDir, name+'.webgmex'),
        sourceFile = args.file,
        user = args.user || null,
        result;

    if (sourceFile) {
        if (!exists(sourceFile)) {
            var error = 'Seed file does not exist.';
            this._logger.error(error);
            fse.rmdirSync(fileDir);
            return callback(error);
        }

        return fse.copy(sourceFile, filePath, err => {
            if (err) {
                fse.rmdirSync(fileDir);
            }
            this._saveSeed(name, filePath, callback);
        });
    }
    // This is lazily loaded because the load takes a couple seconds. This
    // causes a delay for calling 'new' but no other commands
    if (!this._exportProject) {
        var exportCli = require('webgme-engine/src/bin/export');
        this._exportProject = function (parameters, callback) {
            var args = [
                'node', 'export.js',
                '--project-name', parameters.projectName,
                '--out-file', filePath
            ];

            if (parameters.user) {
                args.push('--user');
                args.push(parameters.user);
            }

            if (parameters.branch) {
                args.push('--source');
                args.push(parameters.branch);
            }
            exportCli.main(args)
                .then(callback)
                .catch(callback);
        };
    }

    // Seeds have their own individual dirs to make sure that
    utils.mkdir(fileDir);
    this._logger.info(`About to create a seed from ${branch} of ${projectName}`);

    this._exportProject({gmeConfig, user, branch, projectName}, (err, data) => {
        if (err) {
            this._logger.error('Could not create '+this._name+': '+err);
            fse.rmdirSync(fileDir);
            return callback(err);
        }

        this._saveSeed(name, filePath, callback);
    });
};

SeedManager.prototype._saveSeed = function(name, filePath, callback) {
    // Save the relative file dir
    var fileDir = path.relative(utils.getRootPath(), path.dirname(filePath));
    fileDir = utils.normalize(fileDir);
    this._logger.write('Created '+this._name+' at '+filePath);
    this._register(name, {src: fileDir});
    callback();
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
