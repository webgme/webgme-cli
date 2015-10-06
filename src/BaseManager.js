// jshint node: true
'use strict';

var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    R = require('ramda'),
    mkdir = require('mkdirp'),
    Logger = require('./Logger'),
    PROJECT_CONFIG = 'webgme-setup.json';

var BaseManager = function(logger) {
    this._logger = logger || new Logger();
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
        if (fs.existsSync(setupJsonPath)) {
            err = 'Cannot create project here. Project already exists.';
            this._logger.error(err);
            return callback(err);
        }
    } else {  // Check that the target directory doesn't exist
        if (fs.existsSync(project)) {
            err = 'Cannot create '+args.name+'. File exists.';
            this._logger.error(err);
            return callback(err);
        }
    }

    mkdir(project, function(err) {
        if (err) {
            this._logger.error('Error: '+err);
            return callback(err);
        }

        // Create the package.json
        var pkgJsonTemplatePath = path.join(__dirname, 'res', 'package.template.json'),
            pkgJsonTemplate = _.template(fs.readFileSync(pkgJsonTemplatePath)),
            toolJsonPath = path.join(__dirname, '..', 'package.json'),
            toolJson = require(toolJsonPath),
            pkgContent = {
                webgmeVersion: toolJson.dependencies.webgme,
                name: name
            },
            pkgJson = pkgJsonTemplate(pkgContent);

        this._logger.info('Writing package.json to '+path.join(project, 'package.json'));
        fs.writeFileSync(path.join(project, 'package.json'), pkgJson);

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

        this._logger.write('Created project at '+project+'.\n\n'+
        'Please run \'npm init\' from the within project to finish configuration.');
        callback();
    }.bind(this));
};

BaseManager._createBasicFileStructure = function(project) {
    var dirs = ['src', 'test'];

        dirs.forEach(function(dir) {
            var absDir = path.join(project, dir);
            fs.mkdirSync(absDir);
        });
};

BaseManager.prototype._createWebGMEFiles = function(project) {
    // Create webgme config info
    var configDir = path.join(project, 'config');
    var webgmeConfigTemplate = fs.readFileSync(path.join(__dirname, 'res', 'config.template.js'));
    var webgmeConfig = _.template(webgmeConfigTemplate)(this._getWebGMEConfigContent());

    fs.mkdirSync(configDir);
    fs.writeFileSync(path.join(configDir, 'config.webgme.js'), webgmeConfig);
    fs.readdirSync(path.join(__dirname, 'res', 'config'))
        .map(R.pipe(R.nthArg(0), path.join.bind(path, 'config')))  // Add 'config/' for each
        .forEach(BaseManager._copyFileToProject.bind(null, project, ''));

    // Create app.js
    BaseManager._copyFileToProject(project, '', 'app.js');

    // Create test fixtures
    BaseManager._copyFileToProject(project, 'test', 'globals.js');
};

BaseManager.prototype._getWebGMEConfigContent = function() {
    // TODO
    return {
        pluginPaths: ['src/plugin']
    };
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
