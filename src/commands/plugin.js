/*
 * This file defines the commands and behavior for manipulating WebGME plugins
 */

module.exports = function(emitter) {
    return {
        name: 'plugin',
        cmds: {
            new: function(args) {
                emitter.emit('write', 'New the plugin...');
                // TODO: Load the PluginGenerator from the core plugins
                // and use it to create the boilerplate for the new plugin
            },

            share: function(args) {
                console.log('Sharing the plugin...');
                // TODO: Add entry to webgme config file
            },

            add: function(args) {
                console.log('Adding the plugin...');
                // TODO: Retrieve the plugin from a git repo and add it to
                // the webgme config file
            },

            rm: function(args) {
                console.log('Removing the plugin...');
                // TODO: Remove the plugin directories from src, test
            },

            update: function(args) {
                console.log('Updating the plugin...');
                // TODO
            }
        }
    };
};
