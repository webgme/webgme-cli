define(['lodash',
        'commands/../utils',
        'commands/ComponentManager'], function(_,
                                               utils,
                                               ComponentManager) {
    var AddOnManager = function(emitter) {
        ComponentManager.call(this, 'addOn', emitter);
        // FIXME: This next part should be cleaner
        this.new = AddOnManager.prototype.new;
        this.add = AddOnManager.prototype.add;
        this.rm = AddOnManager.prototype.rm;
    };

    _.extend(AddOnManager.prototype, ComponentManager.prototype);

    AddOnManager.prototype.new = function(args, callback) {
        if (args._.length < 3) {
            this._emitter.emit('error',
                'Usage: webgme new '+this._name+' [name]');
        }
        var name = args._[2],
            id = args.id || name,
            addOnTemplate = _.template(this._getResource('AddOnTemplate.js.ejs')),
            addOnContent = {addOnID: id, addOnName: name},
            addOnSrc = addOnTemplate(addOnContent);

        var filePath = this._saveFile({name: id, content: addOnSrc});
        this._emitter.emit('write', 'Created addon at '+filePath);
        this._register(id, {srcPath: filePath});
        callback();
    };

    // TODO: Verify that we are in a project and that the component exists
    AddOnManager.prototype.rm = ComponentManager.prototype.rm;
    AddOnManager.prototype.add = ComponentManager.prototype.add;

    // TODO: Add enable/disable commands

    return AddOnManager;
});
