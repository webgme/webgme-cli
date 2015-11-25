/*globals define*/
/*
 * This is the basic structure for component managers
 *
 * In the component manager, all public functions (functions not preceded by a _)
 * are assumed to be actions accepted from the command line.
 *
 * Note: "init" is a reserved action and cannot be used by the ComponentManager
 */

'use strict';

var utils = require('./utils'),
    rm_rf = require('rimraf'),
    plural = require('plural'),
    fs = require('fs'),
    path = require('path'),
    childProcess = require('child_process'),
    spawn = childProcess.spawn,
    Logger = require(__dirname + '/Logger');

var ComponentManager = function(name, logger) {
    this._logger = logger || new Logger();
    this._name = name;  // Name to be used in cli usage, etc
    this._group = plural(name);  // Plural version of name
    this._webgmeName = name;  // Name to be used only in webgme config
    this._prepareWebGmeConfig();

    var next;
    for (var action in this) {
        if (action[0] !== '_') {
            next = this[action].bind(this);
            this[action] = this._preprocess.bind(this, next);
        }
    }
};

ComponentManager.prototype._preprocess = function(next, args, callback) {
    // Check for project directory
    if (utils.getRootPath() === null) {
        var err = 'Could not find a project in current or any parent directories';
        this._logger.error(err);
        return callback(err);
    }
    this._prepareWebGmeConfig();
    next(args, callback);
};

/**
 * List the currently recognized components.
 *
 * @param args
 * @param callback
 * @return {undefined}
 */
ComponentManager.prototype.ls = function(args, callback) {
    var config = utils.getConfig(),
        components = Object.keys(config.components[this._group]).join(' ') || '<none>',
        deps = Object.keys(config.dependencies[this._group]).join(' ') || '<none>';

    this._logger.write(
        this._group+':\n' +
            '    local: ' + components + '\n' +
            '    dependencies: ' + deps + '\n'
    );
    callback(null, {components: components, dependencies: deps});
};

ComponentManager.prototype.rm = function(args, callback) {
    var name = args.name,
        config = utils.getConfig(),
        type = config.components[this._group][name] !== undefined ? 
            'components' : 'dependencies',
        record = config[type][this._group][name];

    // Remove from config files
    this._removeFromConfig(name, type);

    // Remove any actual files
    if (type === 'components') {
        // Remove the name directories from src, test
        var paths,
            remaining,
            finished;

        paths = Object.keys(record)
            .filter(key => {
                return fs.existsSync(record[key]);
            });
        remaining = paths.length;
        finished = function() {
            if (--remaining === 0) {
                return callback();
            }
        };

        paths.forEach(function(pathType) {
            var componentPath = record[pathType];
            this._logger.info('Removing '+componentPath);
            if (fs.existsSync(componentPath)) {
                rm_rf(componentPath, finished);
            }
        }, this);
    } else {
        callback();
    }
};

ComponentManager.prototype.add = function(args, callback) {
    var self = this,
        project,
        componentName,
        pkgPath,
        pkgContent,
        projectRoot = utils.getRootPath(),
        pkg,
        job;

    if (!(args.name && args.project)) {
    // FIXME: This shouldn't log to commandline
        return this._logger.error(
        'Usage: webgme add '+this._name+' ['+this._name+'] [project]');
    }
    componentName = args.name;
    project = args.project;
    // Add the project to the package.json
    var pkgProject = utils.getPackageName(project);
    this._logger.info(
        'Adding '+componentName+' from '+pkgProject);

    // Add the component to the webgme config component paths
    // FIXME: Call this without --save then later save it
    job = spawn('npm', ['install', project, '--save'],
        {cwd: projectRoot}); 

    this._logger.info('npm install '+project+' --save');
    this._logger.infoStream(job.stdout);
    this._logger.infoStream(job.stderr);

    job.on('close', function(code) {
        var err,
            info = {
                name: componentName,
                pkg: pkgProject
            };
        self._logger.info('npm exited with: '+code);
        if (code === 0) {  // Success!
            self._getJsonForConfig(info, function(err, configObject) {
                if (err) {
                    self._logger.error(err);
                    return callback(err);
                }

                var config = utils.getConfig();
                config.dependencies[self._group][componentName] = configObject;
                utils.saveConfig(config);

                // Update the webgme config file from 
                // the cli's config
                utils.updateWebGMEConfig();
                configObject.id = componentName;
                return callback(null, configObject);
            });

        } else {
            err = 'Could not find project (' + project + ') !';
            self._logger.error(err);
            return callback(err);
        }
    });
};

ComponentManager.prototype._getJsonForConfig = function(installInfo, callback) {
    var self = this;
    this._getPathFromDependency(installInfo, function(err, componentPath) {
        if (err) {
            return callback(err);
        }
        var pkgProject = installInfo.pkg,
            gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase()),
            dependencyRoot = path.dirname(gmeConfigPath);

        // Verify that the component exists in the project
        if (!componentPath) {
            self._logger.error(pkgProject+' does not contain '+componentPath);
            return callback(pkgProject+' does not contain '+componentPath);
        }
        if (!path.isAbsolute(componentPath)) {
            componentPath = path.join(dependencyRoot, componentPath);
        }
        if (!fs.existsSync(componentPath)) {
            componentPath += '.js';
        }
        // If componentPath is not a directory, take the containing directory
        if (!fs.lstatSync(componentPath).isDirectory()) {
            componentPath = path.dirname(componentPath);
        }

        componentPath = path.relative(utils.getRootPath(), componentPath);

        return callback(null, {
            project: pkgProject,
            path: componentPath
        });
    });
};

ComponentManager.prototype._getPathFromDependency = function(installInfo, callback) {
    // Look up the componentPath by trying to load the config of 
    // the new project or find the component through the component 
    // paths defined in the config.js
    var componentPath = this._getPathFromCliConfig(installInfo) || this._getPathFromGME(installInfo);
    if (!componentPath) {
        var err = 'Could not find the given ' + this._name;
        return callback(err);
    }

    return callback(null, componentPath);
};

ComponentManager.prototype._getPathFromCliConfig = function(installInfo) {
    var pkgProject = installInfo.pkg,
        name = installInfo.name,
        otherConfig,
        gmeCliConfigPath = utils.getConfigPath(pkgProject.toLowerCase());

    if (fs.existsSync(gmeCliConfigPath)) {
        otherConfig = JSON.parse(fs.readFileSync(gmeCliConfigPath, 'utf-8'));
        if (otherConfig.components[this._group][name]) {
            return otherConfig.components[this._group][name].src;
        }
    }
    return null;
};

ComponentManager.prototype._getPathFromGME = function(installInfo) {
    var pkgProject = installInfo.pkg,
        gmeConfigPath = utils.getGMEConfigPath(pkgProject.toLowerCase()),
        name = installInfo.name,
        componentPath,
        otherConfig;

    if (fs.existsSync(gmeConfigPath)) {
        otherConfig = require(gmeConfigPath);
        componentPath = utils.getPathContaining(otherConfig[this._webgmeName].basePaths.map(
        function(p) {
            if (!path.isAbsolute(p)) {
                return path.join(path.dirname(gmeConfigPath), p);
            }
            return p;
        }
        ), name);
        return componentPath !== null ? 
            path.join(componentPath, name) : null;
    }
    return null;
};

ComponentManager.prototype._removeFromConfig = function(plugin, type) {
    var config = utils.getConfig();
    // Remove entry from the config
    delete config[type][this._group][plugin];
    utils.saveConfig(config);
    utils.updateWebGMEConfig();

    this._logger.write('Removed the '+plugin+'!');
};

ComponentManager.prototype._getSaveLocation = function(type) {
    // Guarantee that it is either 'src' or 'test'
    type = type === 'test' ? 'test': 'src';
    var savePath = path.join(utils.getRootPath(), type, this._group);
    // We assume this means the location is relevant and will create
    // it if needed
    utils.mkdir(savePath);
    return savePath;
};

/**
 * Add the names for components and dependencies
 * for this given component type
 *
 * @return {undefined}
 */
ComponentManager.prototype._prepareWebGmeConfig = function() {
    // Check for project directory
    var projectHome = utils.getRootPath();
    if (projectHome !== null) {
        // Check for entry in webgme-setup.json
        var config = utils.getConfig();
        var entries = Object.keys(config);
        entries.forEach(function(entry) {
            if (config[entry][this._group] === undefined) {
                config[entry][this._group] = {};
            }
        }, this);
        utils.saveConfig(config);
    }
};

/**
 * Register the given component in the webgme-setup-tool config
 *
 * @param {String} name
 * @param {Object} content
 * @return {undefined}
 */
ComponentManager.prototype._register = function(name, content) {
    var config = utils.getConfig();
    config.components[this._group][name] = content;
    utils.saveConfig(config);
    utils.updateWebGMEConfig();
};

ComponentManager.prototype._getInstanceType = function(name) {
    var config = utils.getConfig(),
        types = Object.keys(config),
        type = null;

    types.forEach(currentType => {
        if (config[currentType][this._group][name]) {
            type = currentType;
        }
    });
    return type;
};

module.exports = ComponentManager;
