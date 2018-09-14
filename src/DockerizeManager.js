var utils = require('./utils'),
    rm_rf = require('rimraf'),
    plural = require('plural'),
    fs = require('fs'),
    Q = require('q'),
    path = require('path'),
    exists = require('exists-file'),
    Logger = require(__dirname + '/Logger');


const OUT_FILES = {
    DEFAULT: [
        './config/config.docker.js',
        './Dockerfile',
        './DockerfilePluginWorker',
        './docker-compose.yml'
    ],
    PRODUCTION: [
        './config/config.dockerprod.js',
        './DockerfileNginx',
        './docker-compose-prod.yml'
    ],
};

function DockerizeManager(logger) {
    this._logger = logger || new Logger();
}


DockerizeManager.prototype._go_to_root_dir = function() {
    // Check for project directory
    var rootPath = utils.getRootPath();
    var deferred = Q.defer();

    if (rootPath === null) {
        var err = 'Could not find a project in current or any parent directories';
        this._logger.error(err);
        throw new Error(err);
    }

    process.chdir(rootPath);
};

DockerizeManager.prototype.dockerize = function (args) {
    this._go_to_root_dir();

    const tempToFileInfo = [];
    let outfiles = OUT_FILES.DEFAULT;

    if (args.production) {
        outfiles = outfiles.concat(OUT_FILES.PRODUCTION);
    }

    outfiles.forEach((fPath) => {
        if (args.forceUpdate || !exists(fPath)) {
            let tPath = fPath + '.ejs';

            if (tPath.indexOf('./config/')) {
                tPath = tPath.replace('./config/', './');
            }

            tPath.replace('.', path.join(__dirname, 'res'));

            tempToFileInfo.push({
                outPath: fPath,
                template: tPath
            });
        }
    });

    console.log(JSON.stringify(tempToFileInfo, null, 2));
    return;
    const packageJSON = utils.getPackageJSON();

    if (!packageJSON.dependencies['webgme-docker-worker-manager']) {
        packageJSON.dependencies['webgme-docker-worker-manager'] = "latest";
    }
};

module.exports = DockerizeManager;