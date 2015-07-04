// Load in the other files in the directory and load their commands
// TODO

var minimist = require('minimist'),
    path = require('path'),
    requirejs = require('requirejs'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    _ = require('lodash'),
    emitter = new EventEmitter();

// Configure Require JS
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname,
    paths: {
        coreplugins: '../node_modules/webgme/src/plugin/coreplugins',
        plugin: '../node_modules/webgme/src/plugin',
        common: '../node_modules/webgme/src/common',

        'plugin/PluginGenerator/PluginGenerator': '../node_modules/webgme/src/plugin/coreplugins/PluginGenerator/',
    }
});

var setupEventEmitters = function() { 
    // Add Basic Logging
    emitter.on('write', function(msg) {
        console.log(msg);
    });

    emitter.on('error', function(msg) {
        console.error(msg);
        process.exit(1);
    });
};
var executeCommand = function(args) {

    // Remove the first two args
    args._.splice(0,2);

    // Resolve flag aliases to long form
    var shortFlags = Object.keys(aliases),
        longFlag,
        i;

    for (i = shortFlags.length; i--;) {
        if (args[shortFlags[i]]) {
            longFlag = aliases[shortFlags[i]];
            args[longFlag] = true;
        }
    }

    // General flags
    var flags = Object.keys(basicFlags);
    for (i = flags.length; i--;) {
        if (args[flags[i]]) {
            if (basicFlags[flags[i]](args)) {
                return;
            }
        }
    }

    // Commands
    var called = false;
    if (args._.length) {
        // FIXME: Make sure build commands is always executed just in case
        // they need to generate things like the help messages
        buildCommands(function(commands) {
            var action = args._[0],
                item = args._[1];

            // Search for something matching <cmd> <item>
            if (commands[action] && commands[action][item]) {
                called = true;
                return commands[action][item](args);
            } else if (_.isFunction(commands[action])) {
                called = true;
                return commands[action](args);
            }
        });
    }

    if (!called) {
        // Print usage message
        var usageMsg = fs.readFileSync(__dirname+'/../doc/usage.txt', 'utf-8');
        emitter.emit('write', usageMsg);
    }
};

var basicFlags = {
    version: function() {
        var version = require('../package.json').version;
        emitter.emit('write', 'v'+version);
        return true;
    },

    help: function() {
        var helpMsg = fs.readFileSync(__dirname+'/../doc/help.txt', 'utf-8');
        emitter.emit('write', helpMsg);
        return true;
    },

    verbose: function() {
        emitter.on('debug', function(msg) {
            console.log(msg);
        });

        emitter.on('info', function(msg) {
            console.log(msg);
        });

    }
};

var buildCommands = function(callback) {
    var cmds = {
        init: function(args) {
            // Create a new project
            if (args._.length < 2) {
                return emitter.emit('error', 'Usage: webgme init [project name]');
            }

            var project = path.resolve(args._[1]);
            emitter.emit('info', 'Creating new project at '+project);
            fs.mkdirSync(project);

            // Create the package.json
            var packageJSON = {
                name: path.basename(args._[1]).toLowerCase(),
                dependencies: {
                    webgme: '0.12.0-beta.1'  // FIXME
                }
            }; 
            emitter.emit('info', 'Writing package.json to '+path.join(project, 'package.json'));
            fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify(packageJSON));
            // Create the project info file
            fs.writeFileSync(path.join(project, '.webgme'), '');

            emitter.emit('write', 'Created project at '+project+'.\n\n'+
                'Please run \'npm init\' from the within project to finish configuration.');

        }
    };

    // Load in all files in ./commands and decorate the basicCmds
    var files = fs.readdirSync(path.join(__dirname,'commands'))
        .filter(function(file) {  // Only js files
            return path.extname(file) === '.js';
        })
        .map(function(file) {  // Get file path
            return path.join(__dirname,'commands',file);
        });

    // Load the item's command definitions
    requirejs(files, function() {
        var commandDef,
            itemName,
            command,
            commands,
            commandFn;

        for (var i = arguments.length; i--;) {
            commandDef = arguments[i](emitter);
            itemName = commandDef.name;
            commands = Object.keys(commandDef.cmds);
            for (var j = commands.length; j--;) {
                command = commands[j];
                commandFn = commandDef.cmds[command];

                // Add the entry to the command table
                if (!cmds.hasOwnProperty(command)) {
                    cmds[command] = {};
                } 
                cmds[command][itemName] = commandFn;
            }
        }
        callback(cmds);
    });
};

// aliases for flags (eg, -h and --help)
var aliases = {
    h: 'help',
    v: 'verbose'
};

var cli = function(argv) {
    // Clean the args
    var args = minimist(argv);
    setupEventEmitters();
    executeCommand(args);
};

cli.argv = executeCommand;
cli.emitter = emitter;

module.exports = cli;
