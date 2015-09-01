// jshint node: true
'use strict';

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var PROJECT_CONFIG = 'webgme-setup.json';
var BaseManager = function(emitter) {
    this._emitter = emitter;
};

BaseManager.prototype.init = function (args, callback) {
    // Create a new project
    if (args._.length < 2) {
        return this._emitter.emit('error', 'Usage: webgme init [project name]');
    }

    var project = path.resolve(args._[1]);
    this._emitter.emit('info', 'Creating new project at '+project);
    fs.mkdirSync(project);

    // Create the package.json
    var pkgJsonTemplatePath = path.join(__dirname, 'res', 'package.template.json'),
        pkgJsonTemplate = _.template(fs.readFileSync(pkgJsonTemplatePath)),
        pkgContent = {
            name: path.basename(args._[1]).toLowerCase()
        },
        pkgJson = pkgJsonTemplate(pkgContent);

    this._emitter.emit('info', 'Writing package.json to '+path.join(project, 'package.json'));
    fs.writeFileSync(path.join(project, 'package.json'), pkgJson);

    // Create the webgme files
    this._createWebGMEFiles(project);

    // Create the project info file
    var webgmeInfo = {
        components: {},
        dependencies: {}
    };
    fs.writeFileSync(path.join(project, PROJECT_CONFIG), JSON.stringify(webgmeInfo));

    this._emitter.emit('write', 'Created project at '+project+'.\n\n'+
    'Please run \'npm init\' from the within project to finish configuration.');
    callback();
};

BaseManager.prototype._createWebGMEFiles = function(project) {
    // Create config file
    var webgmeConfigTemplate = fs.readFileSync(path.join(__dirname, 'res', 'config.template.js'));
    var webgmeConfig = _.template(webgmeConfigTemplate)(this._getWebGMEConfigContent());
    fs.writeFileSync(path.join(project, 'config.webgme.js'), webgmeConfig);

    // Create editable config file and app.js
    ['config.js', 'app.js'].forEach(this._copyFileToProject.bind(this, project));
};

BaseManager.prototype._getWebGMEConfigContent = function() {
    // TODO
    return {
        pluginPaths: ['src/plugin']
    };
};

BaseManager.prototype._copyFileToProject = function(project, filename) {
    var boilerplatePath = path.join(__dirname, 'res', filename),
    dstPath = path.join(project, filename);

    fs.createReadStream(boilerplatePath)
    .pipe(fs.createWriteStream(dstPath));
};

module.exports = BaseManager;
