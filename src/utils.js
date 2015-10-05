/*globals define*/
'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    R = require('ramda'),
    PROJECT_CONFIG = 'webgme-setup.json';

var getRootPath = function() {
    // Walk back from current path until you find a webgme-setup.json file
    var abspath = path.resolve('.'),
        previousPath;

    while (abspath !== previousPath) {
        if (isProjectRoot(abspath)) {
            return abspath;
        }
        previousPath = abspath;
        abspath = path.dirname(abspath);
    }
    return null;
};

var isProjectRoot = function(abspath) {
    // Check for webgme-setup.json file
    if (!fs.existsSync(abspath)) {
        return null;
    }

    var files = fs.readdirSync(abspath);
    return files.filter(function(file) {
        return file === PROJECT_CONFIG;
    }).length > 0;
};

/**
 * Save file and create directories as needed.
 *
 * @param {File} file
 * @return {undefined}
 */
var saveFile = function(file) {
    var dir = path.dirname(file.name);

    createDir(dir);
    fs.writeFileSync(file.name, file.content);
};

/**
 * Create directory as needed.
 *
 * @param {String} dir
 * @return {undefined}
 */
var createDir = function(dir) {
    var dirs = path.resolve(dir).split(path.sep),
        shortDir,
        i = 1;

    while (i++ < dirs.length) {
        shortDir = dirs.slice(0,i).join(path.sep);
        if (!fs.existsSync(shortDir)) {
            fs.mkdirSync(shortDir);
        }
    }
};

var saveFilesFromBlobClient = function(blobClient) {
    var artifactNames = Object.keys(blobClient.artifacts);
    for (var i = artifactNames.length; i--;) {
        blobClient.artifacts[artifactNames[i]].files.forEach(saveFile);
    }
};

/* * * * * * * Config Settings * * * * * * * */
var getConfig = function() {
    var root = getRootPath();
    var config = fs.readFileSync(path.join(root, PROJECT_CONFIG));
    return JSON.parse(config);
};

var saveConfig = function(config) {
    var root = getRootPath();
    var configText = JSON.stringify(config, null, 2);
    fs.writeFileSync(path.join(root, PROJECT_CONFIG), configText);
};

/**
 * Update the WebGME config based on the paths in the webgme-setup.json. 
 *
 * @return {undefined}
 */
var updateWebGMEConfig = function() {
    var content = getWebGMEConfigContent(),
        templatePath = path.join(__dirname, 'res', 'config.template.js'),
        template = _.template(fs.readFileSync(templatePath)),
        configPath = path.join(getRootPath(), 'config', 'config.webgme.js');

    // Convert paths to use / as path separator
    fs.writeFileSync(configPath, template(content));
};

/**
 * Get the paths from a config (sub) object such as "components" or 
 * "dependencies"
 *
 * Input example: {
 *   plugins: {
 *      ...
 *   },
 *   seeds: {
 *      ...
 *   }
 * }
 *
 * @param {Object} config
 * @return {String[]}
 */
var getPathsFromConfigGroup = function(config) {
    return R.mapObj(function(componentType) {  // ie, plugin/seed/etc OBJECT
        return R.values(componentType).map(function(component) {
            return component.src || component.path;
        });
    }, config);
};

var unique = function(array) {
    var duplicates = {};
    array.forEach(function(key) {
        duplicates[key] = 1;
    });
    return Object.keys(duplicates);
};

var getWebGMEConfigContent = function() {
    var arrays,
        config = getConfig(),
        paths = {},
        configGroupPaths = ['components', 'dependencies']
            .map(function(type) {
                return getPathsFromConfigGroup(config[type]);
            }
        );

    // Merge the arrays for each componentType
    Object.keys(configGroupPaths[0]).forEach(function(type) {
        arrays = configGroupPaths.map(function(group) {
            // Remove duplicates
            return unique(group[type]);
        });

        paths[type] = arrays.reduce(R.concat)  // Merge all paths
            .map(R.replace.bind(R, /\\/g, '/'));  // Convert to use '/' for path separator
    });

    // Set the requirejsPaths to be an array of all dependency paths
    paths.requirejsPaths = getRequireJSPaths(config);
    return paths;
};

var getRequireJSPaths = function(config) {
    var componentTypes = Object.keys(config.dependencies),
        components,
        paths = [],
        names,
        i;

    for (i = componentTypes.length; i--;) {
        components = config.dependencies[componentTypes[i]];
        names = Object.keys(components);
        for (var j = names.length; j--;) {
            paths.push({
                name: names[j],
                path: components[names[j]].src || components[names[j]].path
            });
        }
    }

    // If it has any visualizers, add some boilerplate
    if (hasVisualizers(config)) {
        ['panels', 'widgets'].forEach(function(name) {
            paths.push({
                name: name,
                path: './src/visualizers/'+name
            });
        });

        // Add all dependent visualizers
        // These are in the format 'widgets/DepViz': './node_modules/<project>/<path>'
        var vizConfig = config.dependencies.visualizers,
            dependentVizs = Object.keys(vizConfig),
            depName,
            depPath,
            project;

        for (i = dependentVizs.length; i--;) {
            depName = vizConfig[dependentVizs[i]].src.split('/')
            depName.pop();
            depName = depName.join('/');

            project = vizConfig[dependentVizs[i]].project.toLowerCase();
            depPath = ['.', 'node_modules', project,
                vizConfig[dependentVizs[i]].panel].join('/');

            paths.push({
                name: depName,
                path: depPath
            });

            depPath = ['.', 'node_modules', project,
                vizConfig[dependentVizs[i]].widget].join('/');

            paths.push({
                name: depName.replace('panel', 'widget'),
                path: depPath
            });
        }
    }

    if (!paths.length) {
        paths = null;
    }

    return paths;
};

/**
 * Check that the config contains at least one visualizer (in either components
 * or dependencies)
 *
 * @param config
 * @return {Boolean}
 */
var hasVisualizers = function(config) {
    return ['components', 'dependencies']
        .reduce(function(prev, type) {
            return prev || (config[type].visualizers && 
                Object.keys(config[type].visualizers).length > 0);
        }, false);
};

var getConfigPath = function(project) {
    return path.join(getRootPath(), 'node_modules', 
        project, PROJECT_CONFIG);
};

/**
 * Get the GME path for the given dependent project or the working project
 * if unspecified
 *
 * @param {String} project
 * @return {String} path
 */
var getGMEConfigPath = function(project) {
    var gmeConfigPath,
        projectPath = '';

    if (project) {
        projectPath = path.join('node_modules', project);
    }
    gmeConfigPath = path.join(getRootPath(), projectPath, 'config');

    return gmeConfigPath;
};

/**
 * Find the first path containing the given item.
 *
 * @param {String[]} pathType
 * @param {String} item
 * @return {String} path containing the item
 */
var getPathContaining = function(paths, item) {
    var validPaths = paths.filter(function(p) {
        return fs.existsSync(p) && fs.readdirSync(p).indexOf(item) + 
            fs.readdirSync(p).indexOf(item+'.js') !== -2;
    });
    return validPaths.length ? validPaths[0] : null;
};

/**
 * Get the name of the package installed with "npmPackage"
 *
 * @param {String} npmPackage
 * @return {String} name
 */
var getPackageName = function(npmPackage) {
    // FIXME: It currently assumes everything is a github url. Should support
    // hashes, packages, etc
    // Ideally, we could use an npm feature to do this
    if (npmPackage[0] === '.') {  // File path
        return npmPackage.split(path.sep).pop();
    }

    // Github url: project/repo
    return npmPackage.split('/').pop();
};

var loadPaths = function(requirejs) {
    requirejs.config({
        nodeRequire: require,
        baseUrl: __dirname,
        paths: {
            coreplugins: __dirname+'/../node_modules/webgme/src/plugin/coreplugins',
            plugin: __dirname + '/../node_modules/webgme/src/plugin',
            common: __dirname + '/../node_modules/webgme/src/common',

            'plugin/PluginGenerator/PluginGenerator': __dirname + '/../node_modules/webgme/src/plugin/coreplugins/PluginGenerator/',
            'plugin/VisualizerGenerator/VisualizerGenerator': __dirname + '/../node_modules/webgme/src/plugin/coreplugins/VisualizerGenerator/',
        }
    });
};

module.exports = {
    PROJECT_CONFIG: PROJECT_CONFIG,
    saveConfig: saveConfig,
    getConfig: getConfig,
    getRootPath: getRootPath,
    getGMEConfigPath: getGMEConfigPath,
    getPathContaining: getPathContaining,
    getConfigPath: getConfigPath,
    updateWebGMEConfig: updateWebGMEConfig,
    saveFilesFromBlobClient: saveFilesFromBlobClient,
    saveFile: saveFile,
    loadPaths: loadPaths,
    mkdir: createDir,
    getPackageName: getPackageName
};
