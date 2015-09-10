// jshint node: true
'use strict';

var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    mkdir = require('mkdirp'),
    PROJECT_CONFIG = 'webgme-setup.json';

var BaseManager = function(logger) {
    this._logger = logger;
};

BaseManager.prototype.init = function (args, callback) {  // Create new project
    var project,
        name;

    if (args._.length < 2) {  // Creating in current directory
        // Check if the project is empty
        var isEmpty = fs.readdirSync(process.cwd()).length === 0;
        if (!isEmpty) {
            var err = 'Cannot create project in non-empty directory';
            this._logger.error(err);
            return callback(err);
        }
    }

    project = path.resolve(args._[1] || process.cwd());
    name = path.basename(project).toLowerCase();
    this._logger.info('Creating new project at '+project);
    mkdir(project, function(err) {
        if (err) {
            this._logger.error('Error: '+err);
            return callback(err);
        }

        // Create the package.json
        var pkgJsonTemplatePath = path.join(__dirname, 'res', 'package.template.json'),
            pkgJsonTemplate = _.template(fs.readFileSync(pkgJsonTemplatePath)),
            pkgContent = {
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
    // Create config file
    var webgmeConfigTemplate = fs.readFileSync(path.join(__dirname, 'res', 'config.template.js'));
    var webgmeConfig = _.template(webgmeConfigTemplate)(this._getWebGMEConfigContent());
    fs.writeFileSync(path.join(project, 'config.webgme.js'), webgmeConfig);

    // Create editable config file and app.js
    ['config.js', 'app.js'].forEach(this._copyFileToProject.bind(this, project, null));

    // Create test fixtures
    this._copyFileToProject(project, 'test', 'globals.js');
};

BaseManager.prototype._getWebGMEConfigContent = function() {
    // TODO
    return {
        pluginPaths: ['src/plugin']
    };
};

BaseManager.prototype._copyFileToProject = function(project, subPath, filename) {
    var boilerplatePath,
        dstPath;

    subPath = subPath || '';
    boilerplatePath = path.join(__dirname, 'res', filename);
    dstPath = path.join(project, subPath, filename);

    fs.createReadStream(boilerplatePath)
        .pipe(fs.createWriteStream(dstPath));
};

module.exports = BaseManager;
