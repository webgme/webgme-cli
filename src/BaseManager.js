// jshint node: true
'use strict';

var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    npm = require('npm'),
    rm_rf = require('rimraf'),
    exists = require('exists-file'),
    R = require('ramda'),
    mkdir = require('mkdirp'),
    Logger = require('./Logger'),
    utils = require('./utils'),
    PROJECT_CONFIG = 'webgme-setup.json';

var BaseManager = function(logger) {
    this._logger = logger || new Logger();
};

BaseManager.prototype.start = function (options, callback) {
    var root = utils.getRootPath();

    if (!root) {
        var err = `No webgme app found!`;
        this._logger.error(err);
        return callback(err);
    }

    if (options.hard) {
        this._logger.write('Removing installed modules');
        rm_rf(path.join(root, 'node_modules'), this._start.bind(this, root, callback));
    } else {
        this._start(root, callback);
    }
};

BaseManager.prototype._start = function (root, callback) {
    var webgmePath = path.join(root, 'node_modules', 'webgme-engine');
    npm.load({}, err => {
        if (err) {
            return callback(err);
        }

        this._logger.write('Installing dependencies...');
        npm.install(err => {
            if (err) {
                this._logger.error(`Could not install dependencies: ${err.message}`);
                return callback(err);
            }
            if (!exists(webgmePath)) {
                this._logger.write('Installing webgme...');
                npm.install('webgme', err => {
                    if (err) {
                        this._logger.error(`Could not install webgme dependency: ${err.message}`);
                        return callback(err);
                    }
                    npm.start();
                    callback();
                });
            } else {
                this._logger.write('Webgme already installed. Skipping explicit install...');
                npm.start();
                return callback();
            }

        });
    });
};

BaseManager.prototype.init = function (args, callback) {  // Create new project
    var project,
        name,
        err;

    project = path.resolve(args.name || process.cwd());
    name = path.basename(project).toLowerCase();
    this._logger.info('Creating new project at '+project);

    if (!args.name) {  // Creating in current directory
        // Check if the project contains webgme-setup.json file
        var setupJsonPath = path.join(process.cwd(), PROJECT_CONFIG);
        if (exists(setupJsonPath)) {
            err = 'Cannot create project here. Project already exists.';
            this._logger.error(err);
            return callback(err);
        }
    } else {  // Check that the target directory doesn't exist
        if (exists(project)) {
            err = 'Cannot create '+args.name+'. File exists.';
            this._logger.error(err);
            return callback(err);
        }
    }

    mkdir(project, function(err) {
        if (err) {
            this._logger.error(`Creating project failed: ${err}`);
            return rm_rf(project, e => {
                if (e) {
                    this._logger.error(`Cleanup failed: ${e}`);
                }
                return callback(err);
            });
        }

        // Create the package.json
        this._createPkgJson(project, name);

        // Create the base directories
        BaseManager._createBasicFileStructure(project);

        // Create the webgme files
        this._createWebGMEFiles(project);

        // Create the project info file
        var webgmeInfo = {
            components: {},
            dependencies: {}
        };
        fs.writeFileSync(path.join(project, PROJECT_CONFIG), JSON.stringify(webgmeInfo, null, 2));
        utils.updateWebGMEConfig(project);

        this._logger.write('Created project at '+project+'.\n\nStart your WebGME ' +
            'app with \'webgme start\' from the project root.\n'+
            'It is recommended to run \'npm init\' from the within project ' +
            'to finish configuration.');
        callback();
    }.bind(this));
};

BaseManager.prototype._createPkgJson = function(project, name) {
    var pkgJsonTemplatePath = path.join(__dirname, 'res', 'package.template.json'),
        pkgJsonTemplate = _.template(fs.readFileSync(pkgJsonTemplatePath)),
        toolJsonPath = path.join(__dirname, '..', 'package.json'),
        toolJson = require(toolJsonPath),
        pkgContent = {
            webgmeVersion: toolJson.dependencies['webgme-engine'],
            name: name
        },
        outputPkgJson = path.join(project, 'package.json'),
        originalPkgJson = {},
        newPkgJson = JSON.parse(pkgJsonTemplate(pkgContent)),
        pkgJson;

    // Load existing package.json, if exists
    if (exists(outputPkgJson)) {
        originalPkgJson = require(outputPkgJson);
        // We will remove the require cache for the package.json since
        // we are changing it now
        delete require.cache[require.resolve(outputPkgJson)];
    }
    pkgJson = _.extend({}, originalPkgJson, newPkgJson);

    // Copy the dev and regular dependencies separately (_.extend is shallow)
    pkgJson.dependencies = _.extend(
        originalPkgJson.dependencies || {},
        newPkgJson.dependencies
    );
    pkgJson.devDependencies = _.extend(
        originalPkgJson.devDependencies || {},
        newPkgJson.devDependencies
    );

    this._logger.info('Writing package.json to ' + outputPkgJson);

    fs.writeFileSync(outputPkgJson, JSON.stringify(pkgJson, null, 2));
};

BaseManager._createBasicFileStructure = function(project) {
    var vizDir = path.join('src', 'visualizers'),
        dirs = ['src', 'test', path.join('src', 'common'), vizDir];

    dirs.forEach(dir => {
        var absDir = path.join(project, dir);
        fs.mkdirSync(absDir);
    });

    fs.writeFileSync(path.join(project, vizDir, 'Visualizers.json'), '[]');
};

BaseManager.prototype._createWebGMEFiles = function(project) {
    // Create webgme config info
    var configDir = path.join(project, 'config');

    // Config files
    fs.mkdirSync(configDir);
    fs.readdirSync(path.join(__dirname, 'res', 'config'))
        .map(R.pipe(R.nthArg(0), path.join.bind(path, 'config')))  // Add 'config/' for each
        .forEach(BaseManager._copyFileToProject.bind(null, project, ''));

    // Create app.js
    BaseManager._copyFileToProject(project, '', 'app.js');

    // Create test fixtures
    BaseManager._copyFileToProject(project, 'test', 'globals.js');

    // Create .gitignore
    BaseManager._createGitIgnore(project);

    // Create src/common README.md
    BaseManager._createCommonReadme(project);

    // Create README.md
    BaseManager._createReadme(project);
};

BaseManager._createReadme = function(project) {
    var boilerplatePath = path.join(__dirname, 'res', 'README.md.ejs'),
        readme = _.template(fs.readFileSync(boilerplatePath, 'utf8')),
        dstPath = path.join(project, 'README.md'),
        content = {
            name: path.basename(project)
        };

    if (!exists(dstPath)) {
        fs.writeFileSync(dstPath, readme(content));
    }
};

BaseManager._createCommonReadme = function(project) {
    var boilerplatePath = path.join(__dirname, 'res', 'README.common.md.ejs'),
        readme = _.template(fs.readFileSync(boilerplatePath, 'utf8')),
        dstPath = path.join(project, 'src', 'common', 'README.md'),
        content = {
            name: path.basename(project)
        };

    if (!exists(dstPath)) {
        fs.writeFileSync(dstPath, readme(content));
    }
};

/**
 * Copy the file to the project if the file doesn't already exist
 *
 * @param {String} project
 * @param {String} subPath
 * @param {String} filename
 * @return {undefined}
 */
BaseManager._createGitIgnore = function(project) {
    var boilerplatePath = path.join(__dirname, 'res', 'gitignore'),
        dstPath = path.join(project, '.gitignore');

    if (!exists(dstPath)) {
        fs.createReadStream(boilerplatePath)
            .pipe(fs.createWriteStream(dstPath));
    }
};

BaseManager._copyFileToProject = function(project, subPath, filename) {
    var boilerplatePath,
        dstPath;

    subPath = subPath || '';
    boilerplatePath = path.join(__dirname, 'res', filename);
    dstPath = path.join(project, subPath, filename);

    fs.createReadStream(boilerplatePath)
        .pipe(fs.createWriteStream(dstPath));
};

module.exports = BaseManager;
