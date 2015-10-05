'use strict';

var fs = require('fs'),
    path = require('path');

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

module.exports = {
    getSupportedSubCommands: getSupportedSubCommands
};
