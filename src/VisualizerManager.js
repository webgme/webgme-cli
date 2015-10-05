/*globals define*/
/*
 * All functions not prepended with an '_' are considered actions callable
 * from the commandline. The name of the file is considered the name of the
 * item.
 *
 * This convention is most important bc of the addition of a preprocessing
 * function to all these functions in the ComponentManager constructor.
 */

'use strict';
var _ = require('lodash'),
    R = require('ramda'),
    path = require('path'),
    rm_rf = require('rimraf'),
    fs = require('fs'),
    utils = require('./utils'),
    ComponentManager = require('./ComponentManager'),
    VisualizerGenerator = require('./shim/VisualizerGenerator'),
    Enableable = require('./mixins/Enableable/Enableable'), 
    PluginHelpers = require('./shim/PluginHelpers'),
    RAW_CONFIG = VisualizerGenerator.prototype.getConfigStructure();

var VisualizerManager = function(logger) {
    ComponentManager.call(this, 'visualizer', logger);
    Enableable.call(this, 'validVisualizers');
};

_.extend(VisualizerManager.prototype, ComponentManager.prototype,
    Enableable.prototype);

/**
 * Create a new visualizer
 *
 * @param args
 * @return {undefined}
 */
VisualizerManager.prototype.new = function(options, callback) {
    // Set the config options from the command line flags
    var self = this,
        visualizerGenerator = new VisualizerGenerator(this._logger, options),
        id = options.visualizerID,
        name = options.name || id,
        setupConfig;

    visualizerGenerator.main(function(e) {
        if (e) {
            return callback(e);
        }

        // Get the src, test paths
        var paths = R.mapObjIndexed(function(empty, type) {
            return path.join('src', 'visualizers', type+'s', id);
        }, {widget: null, panel: null});

        // Store the visualizer info in the webgme-setup.json file

        setupConfig = {
            src: 'panels/'+id+'/'+id+'Panel',
            title: name,
            panel: paths.panel,
            widget: paths.widget
        };
        self._register(options.visualizerID, setupConfig);
        self._addToVisualizersJSON(id, name, setupConfig.src);
        self._logger.write('Created new visualizer at '+setupConfig.src);
        callback();
    });
};

VisualizerManager.prototype._addToVisualizersJSON = function(id, title, panelPath) {
    var visualizersPath = path.join(utils.getRootPath(), 'src', 'visualizers', 'Visualizers.json'),
        currentJson = [],
        visDefinition;

    if (fs.existsSync(visualizersPath)) {
        currentJson = require(visualizersPath);
    }

    visDefinition = {
        id: this._getUniqueVizId(id, currentJson),
        title: title,
        panel: panelPath,
        DEBUG_ONLY: false
    };

    currentJson.push(visDefinition);
    fs.writeFileSync(visualizersPath, JSON.stringify(currentJson, null, 2));
};

VisualizerManager.prototype._getUniqueVizId = function(id, visualizers) {
    var newId = id,
        count = 1,
        ids = {};

    visualizers = visualizers || this._getVisualizers();
    for (var i = visualizers.length; i--;) {
        ids[visualizers[i].id] = true;
    }

    while (ids[newId]) {
        newId = id + (count++);
    }
    return newId;
};

// Overrides
VisualizerManager.prototype._getJsonForConfig = function(installInfo, callback) {
    var vizObject = this._getObjectFromCliConfig(installInfo);

    vizObject.project = installInfo.pkg;
    return callback(null, vizObject);
};

VisualizerManager.prototype._getObjectFromCliConfig = function(installInfo) {
    var pkgProject = installInfo.pkg,
        name = installInfo.name,
        otherConfig,
        gmeCliConfigPath = utils.getConfigPath(pkgProject.toLowerCase());

    // Visualizers can only be imported from projects created with the
    // webgme-setup-tool as they are not contained like plugins, addons,
    // or seeds

    if (fs.existsSync(gmeCliConfigPath)) {
        otherConfig = JSON.parse(fs.readFileSync(gmeCliConfigPath, 'utf-8'));
        if (otherConfig.components[this._group][name]) {
            return otherConfig.components[this._group][name];
        }
    }
    return null;
};

VisualizerManager.prototype.rm = function(options, callback) {
    // Remove the 'src' key from the webgme-setup.json then call the
    // ComponentManager.prototype.rm
    var name = options.name,  // TODO: Change this to id
        config = utils.getConfig(),
        type = config.components[this._group][name] !== undefined ? 
            'components' : 'dependencies';

    delete config[type][this._group][name].src;
    delete config[type][this._group][name].title;
    utils.saveConfig(config);
    ComponentManager.prototype.rm.call(this, options, callback);

    // Remove the given visualizer from the Visualizers.json file
    var visJsonPath = path.join(utils.getRootPath(), 'src', 'visualizers',
            'Visualizers.json'),
        visJson = require(visJsonPath);

    for (var i = visJson.length; i--;) {
        if (visJson[i].id === name) {
            visJson.splice(i, 1);
        }
    }
    fs.writeFileSync(visJsonPath, JSON.stringify(visJson, null, 2));
};

VisualizerManager.prototype.add = function(options, callback) {
    var self = this;
    ComponentManager.prototype.add.call(this, options, function(err, result) {
        // Add to the visualizers json
        var id = self._getUniqueVizId(result.id);
        self._addToVisualizersJSON(id, result.title, result.src);
        return callback(null, result);
    });
};

VisualizerManager.prototype._getVisualizers = function() {
    var visualizersPath = path.join(utils.getRootPath(), 'src', 'visualizers', 'Visualizers.json'),
        currentJson = [];

    if (fs.existsSync(visualizersPath)) {
        currentJson = require(visualizersPath);
    }
    return currentJson;
};


module.exports = VisualizerManager;
