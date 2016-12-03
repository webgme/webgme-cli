'use strict';

var fs = require('fs'),
    path = require('path'),
    utils = require('./utils'),
    _ = require('lodash');

// TODO: Find a better spot for this...
var alias = {
        viz: 'visualizer'
    },
    rAlias = {};

// Create the reverse alias map
Object.keys(alias).forEach(a => rAlias[alias[a]] = a);

var getSupportedSubCommands = function(dir) {
    var filename = process.argv[1].split(path.sep).pop(),
        files = fs.readdirSync(dir);
    
    return files
        .filter(function(file) {  // Remove hidden files and self
            return file.indexOf('.') !== 0 && file.length > filename.length;
        })
        .filter(function(file) {  // Find subcommands
            return file.indexOf(filename) !== -1;
        })
        .map(function(file) {
            // get the string between the next '-'s
            var name = file.replace(filename+'-', '').split('-').shift();
            return {name: alias[name] || name, cmd: name};
        });
};

var getComponentFromName = function(name, config) {
    var types = ['components', 'dependencies'],
        components = Object.keys(config.components),
        cmpnt;

    for (var t = types.length; t--;) {
        for (var c = components.length; c--;) {
            cmpnt = components[c];
            if (config[types[t]][cmpnt][name]) {
                return cmpnt;
            }
        }
    }
    return null;
};

var createCommands = function(components, defArgs, descTs, opts) {
    var Command = require('commander').Command,
        program = opts.program || new Command(),
        customDescs = opts.descs || {},
        customArgs = opts.args || {},
        descT,
        args;

    components.forEach(component => {
        descT = _.template(customDescs.hasOwnProperty(component.name) ?
            customDescs[component.name] : descTs);
        args = customArgs.hasOwnProperty(component.name) ?
            customArgs[component.name] : defArgs;
        program.command(`${component.cmd} ${args}`, descT(component));
    });

    return program;
};

var createSubCommands = function(dir, defArgs, descTs, opts) {
    var components = getSupportedSubCommands(dir),
        componentNames = {},
        program,
        inferrable,
        component = process.argv[2];

    opts = opts || {};
    inferrable = !opts.explicit;

    // If component is invalid, fail with error
    components.forEach(c => componentNames[c.cmd] = c);
    program = createCommands(_.values(componentNames), defArgs, descTs, opts);

    if (!componentNames[component]) {
        var config = utils.getConfig();
        if (inferrable && config) {  // Try to infer the component. Assume name is provided
            var name = process.argv[2],
                nameIndex = 2,
                aliased = Object.keys(alias).map(a => alias[a]);

            while (process.argv[nameIndex] && process.argv[nameIndex][0] === '-') {  // skip options
                nameIndex++;
            }
            component = getComponentFromName(name, config);
            if (component) {
                // Adjust plurality, etc
                component = [component, component.replace(/s$/, '')]
                    .find(c => componentNames[c] || aliased.find(a => c === a));

            } 

            process.argv.splice(2, 0, rAlias[component] || component || '--help');
        } else {
            // Show the help message
            process.argv[2] = '--help';
        }
    }

    program.parse(process.argv);
};

module.exports = {
    getSupportedSubCommands,
    createSubCommands
};
