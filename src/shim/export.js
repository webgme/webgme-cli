'use strict';

var webgme = require('webgme'),
    config = require('webgme/config/config.default'),
    fs = require('fs'),
    STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
    Q = require('q'),
    PluginCliManager = require('webgme/src/plugin/climanager'),
    BlobClient = require('webgme/src/server/middleware/blob/BlobClientWithFSBackend'),
    gmeAuth,
    cliStorage;

var exporter = function(params, callback) {
    var gmeConfig = params.gmeConfig,
        logger = webgme.Logger.create('gme:bin:export', gmeConfig.bin.log, false);

    webgme.addToRequireJsPaths(gmeConfig);
    return webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth__) {
            gmeAuth = gmeAuth__;
            cliStorage = webgme.getStorage(logger.fork('storage'), gmeConfig, gmeAuth);
            return cliStorage.openDatabase();
        })
        .then(function () {
            var projectParams = {
                projectId: ''
            };

            if (params.owner) {
                projectParams.projectId = params.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + params.projectName;
            } else if (params.user) {
                projectParams.projectId = params.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + params.projectName;
            } else {
                projectParams.projectId = gmeConfig.authentication.guestAccount +
                    STORAGE_CONSTANTS.PROJECT_ID_SEP + params.projectName;
            }

            if (params.user) {
                projectParams.username = params.user;
            }

            return cliStorage.openProject(projectParams);
        })
        .then(function (project) {
            // Create the climanager
            var manager = new PluginCliManager(null, logger, gmeConfig),
                pluginConfig = {
                    assets: true,
                    type: 'Export'
                },
                context = {
                    project,
                    branchName: params.branch,
                    activeNode: ''
                };

            return Q.nfcall(manager.executePlugin, 'ExportImport', pluginConfig, context);
        })
        .then(res => {
            var artifact = res.artifacts[0];
            var blobClient = new BlobClient(gmeConfig, logger);
            return Q.nfcall(blobClient.getObject.bind(blobClient), artifact);
        })
        .nodeify(callback);
};

module.exports = exporter;
