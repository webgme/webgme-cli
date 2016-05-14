'use strict';

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash');

// TODO: Find a better spot for this...
var alias = {
    viz: 'visualizer'
};

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

var createSubCommands = function(dir, args, descTs) {
    'use strict';
    var Command = require('commander').Command,
        program = new Command(),
        descT = _.template(descTs),
        components = getSupportedSubCommands(dir),
        component = process.argv[2];

    components.forEach(component =>
        program.command(`${component.cmd} ${args}`, descT(component))
    );

    // If component is invalid, fail with error
    if (components.indexOf(component) === -1) {
        // Show the help message
        process.argv[2] = '--help';
    }

    program.parse(process.argv);
};

module.exports = {
    getSupportedSubCommands,
    createSubCommands
};
