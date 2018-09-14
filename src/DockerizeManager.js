const NODE_RELEASE = 'carbon'; // Node release used in Dockerfiles

var utils = require('./utils'),
    rm_rf = require('rimraf'),
    plural = require('plural'),
    fs = require('fs'),
    Q = require('q'),
    path = require('path'),
    ejs = require('ejs'),
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
        const existed = exists(fPath);
        if (args.forceUpdate || !existed) {
            let tPath = fPath + '.ejs';

            if (tPath.indexOf('./config/') === 0) {
                tPath = tPath.replace('./config/', './');
            }

            tPath = tPath.replace('.', path.join(__dirname, 'res'));

            tempToFileInfo.push({
                outPath: fPath,
                template: tPath,
                existed: existed,
            });
        } else {
            this._logger.write(`warn: ${fPath} already existed, use --forceUpdate to overwrite`);
        }
    });

    // console.log(JSON.stringify(tempToFileInfo, null, 2));
    const appName = path.basename(process.cwd());
    tempToFileInfo.forEach((info) => {
        const rendered = ejs.render(fs.readFileSync(info.template, 'utf-8'), {
            appName: appName,
            nodeRelease: NODE_RELEASE,
        });

        fs.writeFileSync(info.outPath, rendered);

        this._logger.write(`${info.existed ? 'Updated' : 'Created'} ${info.outPath}`);
    });

    const packageJSON = utils.getPackageJSON();

    if (!packageJSON.dependencies['webgme-docker-worker-manager']) {
        packageJSON.dependencies['webgme-docker-worker-manager'] = "latest";
    }

    utils.writePackageJSON(packageJSON);
};

module.exports = DockerizeManager;