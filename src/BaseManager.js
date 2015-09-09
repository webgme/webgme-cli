// jshint node: true
'use strict';

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var PROJECT_CONFIG = 'webgme-setup.json';
var BaseManager = function(logger) {
    this._logger = logger;
};

BaseManager.prototype.init = function (args, callback) {
    // Create a new project
    if (args._.length < 2) {
        return this._logger.error('Usage: webgme init [project name]');
    }

    var project = path.resolve(args._[1]);
    this._logger.info('Creating new project at '+project);
    fs.mkdirSync(project);

    // Create the package.json
    var pkgJsonTemplatePath = path.join(__dirname, 'res', 'package.template.json'),
        pkgJsonTemplate = _.template(fs.readFileSync(pkgJsonTemplatePath)),
        pkgContent = {
            name: path.basename(args._[1]).toLowerCase()
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
    fs.writeFileSync(path.join(project, PROJECT_CONFIG), JSON.stringify(webgmeInfo,null,2));

    this._logger.write('Created project at '+project+'.\n\n'+
    'Please run \'npm init\' from the within project to finish configuration.');
    callback();
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
