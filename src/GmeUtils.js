/* globals define*/
define(['path',
        'webgme',
        'common/core/core',
        'webgme/src/server/storage/userproject'], function(path, 
                                                           webgme, 
                                                           // FIXME: There is a problem
                                                           // with loading core...
                                                           Core,
                                                           Project) {
    'use strict';

    var getCore = function(projectName, branch, gmeConfig, callback) {
            // FIXME: Set this to something meaningful
        var logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
            storage,
            project,
            pluginConfig;

        callback = callback || function () {};

        webgme.addToRequireJsPaths(gmeConfig);

        webgme.getGmeAuth(gmeConfig)
            .then(function (gmeAuth) {
                storage = webgme.getStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                logger.info('Database is opened.');
                return storage.openProject({projectName: project});
            })
            .then(function (dbProject) {
                logger.info('Project is opened.');
                project = new Project(dbProject, storage, logger, gmeConfig);
                return storage.getBranchHash({
                    projectName: project,
                    branchName: branch
                });
            })
            .then(function (commitHash) {
                logger.info('CommitHash obtained ', commitHash);

                project.loadObject(commitHash, function(err, commitObject) {
                    var core,
                        root;

                    core = new Core(project, {
                        globConf: gmeConfig,
                        logger: logger.fork('core')
                    });

                    core.loadRoot(commitObject.root, function (err, rootNode) {
                        callback(err, core, rootNode);
                    });
                });
            })
            .catch(function (err) {
                logger.error('Could not open the project or branch', err);
                callback(err);
            });
    };

    return {
        getCore: getCore
    };
});
