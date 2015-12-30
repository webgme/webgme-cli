'use strict';

// Generate the completion scripts for bash
var path = require('path'),
    ejs = require('ejs'),
    fs = require('fs'),
    srcPath = path.join(__dirname, '..', 'src', 'res', 'webgme.completion.ejs'),
    outFile = path.join(__dirname, '..', 'extra', 'webgme.completion.bash'),
    srcDir = __dirname,
    tmpName = path.join(__dirname, '..', 'tmp-' + new Date().getTime()),
    rm_rf = require('rimraf'),
    tmpDir = fs.mkdirSync(tmpName),
    mainFile = path.join(srcDir, 'webgme');

// Get the command/option structure from commander
var Commander = require('commander').Command;

// Hack to prevent Commander from calling process.exit
Commander.prototype.parse = function() {
    this.args = arguments;
};

/* * * * * * * Helper Functions * * * * * * */
// Follow the git style structure
var createTmpFile = function(name) {
    var content = fs.readFileSync(path.join(srcDir, name), 'utf8');
    content += '\nmodule.exports = program;';
    fs.writeFileSync(path.join(tmpName, name), content);
};

// Create all tmp files
var files = fs.readdirSync(srcDir);
for (var i = files.length; i--;) {
    // Add the module.exports = program to the file
    createTmpFile(files[i]);
}

var isGitStyleSubCmd = function(parent, child) {
    return parent._execs[child._name] &&
        typeof parent._execs[child._name] !== 'function';
};

var loadCommand = function(name, base) {
    var result = {},
        subcommand,
        command;

    // load the command
    if (base) {
        name = base._name + '-' + name;
    }

    process.argv[1] = name;
    command = require(path.join(tmpName, name));

    // Verify that the commands have names...
    if (!command._name) {
        command._name = name;
    }

    // Load commands without actions recursively
    for (var i = command.commands.length; i--;) {
        subcommand = command.commands[i];
        if (isGitStyleSubCmd(command, subcommand)) {
            result[subcommand._name] = loadCommand(subcommand._name, command);
        } else {
            result = subcommand.options.map(opt => opt.long);
        }
    }

    if (command.commands.length === 0) {
        return command.options.map(opt => opt.long);
    }

    return result;
};

// Populate the template
var content = {cmd: 'webgme', args: loadCommand('webgme')},
    templateFile,
    template;

templateFile = fs.readFileSync(srcPath, 'utf8').toString();
template = ejs.compile(templateFile);

console.log('Creating the completion file at ' + outFile);
fs.writeFileSync(outFile, template(content));

rm_rf(tmpName, function(){});
