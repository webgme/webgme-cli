/*globals define*/
define(['lodash',
        'commands/../utils',
        'commands/ComponentManager'], function(_,
                                               utils,
                                               ComponentManager) {
    'use strict';
    
    var AddOnManager = function(logger) {
        ComponentManager.call(this, 'addOn', logger);

        // Copy actions over from ComponentManager
        ['ls', 'add', 'rm'].forEach(function(action) {
            this[action] = ComponentManager.prototype[action];
        }, this);
        this.new = AddOnManager.prototype.new;
    };

    _.extend(AddOnManager.prototype, ComponentManager.prototype);

    AddOnManager.prototype.new = function(args, callback) {
        if (args._.length < 3) {
            this._logger.error('error',
                'Usage: webgme new '+this._name+' [name]');
        }
        var name = args._[2],
            id = args.id || name,
            addOnTemplate = _.template(this._getResource('AddOnTemplate.js.ejs')),
            addOnContent = {addOnID: id, addOnName: name},
            addOnSrc = addOnTemplate(addOnContent);

        var filePath = this._saveFile({name: id, content: addOnSrc});
        this._logger.write('Created addon at '+filePath);
        this._register(id, {src: filePath});
        callback();
    };

    // TODO: Verify that we are in a project and that the component exists
    // TODO: Add enable/disable commands

    return AddOnManager;
});
