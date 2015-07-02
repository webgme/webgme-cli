/*
 * This file defines the commands and behavior for manipulating WebGME plugins
 */

define(['coreplugins/PluginGenerator/PluginGenerator'], function(PluginGenerator) {

    /*
     * Generate the help messages from the plugin config structure.
     *
     * TODO
     */
    return function(emitter) {
        return {
            name: 'plugin',
            cmds: {
                new: function(args) {
                    // Load the PluginGenerator from the core plugins
                    // Use it to create the boilerplate for the new plugin
                    var webgmePluginGenerator = new PluginGenerator();

                    // Set the config options from the command line flags
                    // TODO

                    // Make the src/plugins test/plugins directories as needed
                    // TODO
                    emitter.emit('write', 'New plugin...');
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
});
