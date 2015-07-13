// Load in the other files in the directory and load their commands
// TODO

var minimist = require('minimist'),
    path = require('path'),
    requirejs = require('requirejs'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    BaseManager = require('./BaseManager'),
    _ = require('lodash');

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

// aliases for flags (eg, -h and --help)
var ALIASES = {
    h: 'help',
    v: 'verbose'
};

// JS Files to skip when loading managers from ./commands
var SKIP_FILES = ['ComponentManager.js'];
var EMPTY_HELP_CONTENT = {options: []};

var WebGMEComponentManager = function() {
    this.emitter = new EventEmitter();
    this.componentManagers = {};
    this.baseManager = null;
};

// TODO: Move this to a separate file
WebGMEComponentManager.prototype.BasicFlags = {
    version: function() {
        var version = require('../package.json').version;
        this.emitter.emit('write', 'v'+version);
        return true;
    },

    help: function(managers, args) {
        // Get the relevant help message, if available. It will be in 
        // /item/help.action.txt
        var defaultPath = __dirname+'/../doc/help.txt',
            action = '',
            item = '',
            actionPath = '',
            itemPath = '',
            helpTemplate,
            helpContent,
            helpMsg,
            path,
            useDefault;

        // TODO: Refactor this next portion
        if (args._.length) {
            action = args._.shift();
            actionPath = action+'.';
        }

        if (args._.length) {
            item = args._.shift();
            itemPath = item+'/';
        }

        path = __dirname+'/../doc/'+itemPath+'help.'+actionPath+'txt';
        useDefault = !fs.existsSync(path) || action+item === '';
        if (!useDefault) {  // If path exists TODO
            // Create the information for the template
            if (this.baseManager[action]) {
                if (this.componentManagers[item][action]) {
                    helpContent = this.componentManagers[item][action];
                } else {
                    helpContent = this.baseManager[action];
                }
            }

            this.emitter.emit('info', 'Retrieving help message from '+path);
        } else {  // Use the default TODO
            path = defaultPath;
            helpContent = this.getDefaultHelpContent();
        }

        helpTemplate = fs.readFileSync(path, 'utf-8');
        helpContent = _.extend({}, EMPTY_HELP_CONTENT, helpContent);
        helpMsg = _.template(helpTemplate)(helpContent);
        this.emitter.emit('write', helpMsg);
        return true;
    },

    verbose: function() {
        this.emitter.on('debug', function(msg) {
            console.log(msg);
        });

        this.emitter.on('info', function(msg) {
            console.log(msg);
        });

    }
};


WebGMEComponentManager.prototype.invokeFromCommandLine = function(argv) {
    // Clean the args
    var args = minimist(argv);
    this.setupEventEmitters();
    this.executeCommand(args);
};

WebGMEComponentManager.prototype.setupEventEmitters = function() { 
    // Add Basic Logging
    this.emitter.on('write', function(msg) {
        console.log(msg);
    });

    this.emitter.on('error', function(msg) {
        console.error(msg);
        process.exit(1);
    });
};

WebGMEComponentManager.prototype._resolveAliases = function(args) {
    var shortFlags = Object.keys(ALIASES),
    longFlag,
    i;

    for (i = shortFlags.length; i--;) {
        if (args[shortFlags[i]]) {
            longFlag = ALIASES[shortFlags[i]];
            args[longFlag] = true;
        }
    }
    return args;
};

WebGMEComponentManager.prototype.executeCommand = function(args) {

    // Remove the first two args
    args._.splice(0,2);
    this.createManagers(function() {

        // Resolve flag aliases to long form
        args = this._resolveAliases(args);

        // General flags (eg, help, etc)
        var flags = Object.keys(this.BasicFlags);
        for (i = flags.length; i--;) {
            if (args[flags[i]]) {
                if (this.BasicFlags[flags[i]].call(this, this.componentManagers, args)) {
                    return;
                }
            }
        }

        // Pass the argument to the respective manager
        if (!this._invokeComponentManager(args)) {
            // If not handled, print usage message
            var usageMsg = fs.readFileSync(__dirname+'/../doc/usage.txt', 'utf-8');
            this.emitter.emit('write', usageMsg);
        }
    }.bind(this));
};

/**
 * Invoke a component manager, if applicable.
 *
 * @param {CommandLineArgs} args
 * @return {Boolean} True if component manager invoked
 */
WebGMEComponentManager.prototype._invokeComponentManager = function(args) {
    var action,
        item;

    if (args._.length) {
        // Search for something matching <action> <item>
        action = args._[0]
            .replace(/^[_]*/, '');  // Don't allow the user to invoke private methods
        // Check if it is a base command
        if (this.baseManager[action]) {
            this.baseManager[action](args);
            return true;
        }

        if (args._.length > 1) {
            item = args._[1];
            // Otherwise, pass it to the respective component manager
            if (this.componentManagers[item]) {
                this.componentManagers[item][action](args);
                return true;
            }
        }
    }
    return false;
};

/**
 * Get the default help content from the commands
 *
 * @param {Object} commands
 * @return {Object} This is a dictionary of component names sorted by action
 */
WebGMEComponentManager.prototype.getDefaultHelpContent = function() {
    var self = this,
        components = Object.keys(this.componentManagers);
    return {
        actions: components.map(function(name) {
            return {
                name: name,
                items: Object.keys(self.componentManagers[name])
                    .filter(function(action) {
                        return action.indexOf('_') !== 0;
                    })
            };
        })
    };
};

WebGMEComponentManager.prototype.createManagers = function(callback) {
    // Load the base manager
    this.baseManager = new BaseManager(this.emitter);

    // Load in all files in ./commands and decorate the basicCmds
    var files = fs.readdirSync(path.join(__dirname,'commands'))
        .filter(function(file) {  // Only js files
            return path.extname(file) === '.js' &&
                // Skip the abstract base type
                SKIP_FILES.indexOf(path.basename(file)) === -1;
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
            // TODO: Update this for a manager
            componentManager = new arguments[i](this.emitter);
            itemName = path.basename(files[i]).split('.js')[0];

            // Add the entry to the command table
            this.componentManagers[itemName] = componentManager;
        }
        callback();
    }.bind(this));
};

module.exports = WebGMEComponentManager;
