/*globals define*/
define(['lodash',
        'commands/../utils',
        'fs',
        'path',
        'module',
        'commands/ComponentManager'], function(_,
                                               utils,
                                               fs,
                                               path,
                                               module,
                                               ComponentManager) {
    'use strict';
    
    var __dirname = path.dirname(module.uri),
        nodeRequire = require.nodeRequire;
    var SeedManager = function(logger) {
        ComponentManager.call(this, 'seed', logger);
        //this._exportProject = Exporter.run;
        this._webgmeName = 'seedProjects';

        // Copy actions over from ComponentManager
        ['ls', 'add', 'rm'].forEach(function(action) {
            this[action] = ComponentManager.prototype[action];
        }, this);
        this.new = SeedManager.prototype.new;
    };

    _.extend(SeedManager.prototype, ComponentManager.prototype);

    /**
     * Use the WebGME export script to dump the given project to a file.
     *
     * @param args
     * @param {Function} callback
     * @return {undefined}
     */
    SeedManager.prototype.new = function(args, callback) {
        if (args._.length < 3) {
            return this._logger.error('Usage: webgme new '+this._name+' [project] [options]');
        }
        // Lazy load the export dependency. This is done here to prevent slow
        // execution times when this manager is instantiated (as it is on every
        // command).
        if (!this._exportProject) {
            var Exporter = nodeRequire(__dirname+'/shim/export.js');
            this._exportProject = Exporter.run;
        }
        var gmeConfigPath = utils.getGMEConfigPath(),
            gmeConfig = nodeRequire(gmeConfigPath),
            projectName = args._[2],
            name = (args.name || projectName).replace(/\.js(on)?$/,''),
            source = args.source || 'master',  // branch or commit
            fileDir = path.join(this._getSaveLocation(),name),
            filePath = path.join(fileDir, name+'.js'),
            result;

        // Seeds have their own individual dirs to make sure that
        fs.mkdirSync(fileDir);
        this._logger.info('About to create a seed from '+source+' of '+
            projectName);
        this._exportProject({gmeConfig: gmeConfig,
                             projectName: projectName, 
                             source: source, 
                             outFile: filePath})
            .then(function() {
                this._logger.write('Created '+this._name+' at '+filePath);
                this._register(name, {src: fileDir});
                //this._register(name, {src: path.relative(__dirname, fileDir)});
                callback();
            }.bind(this));
    };

    SeedManager.prototype.new.options = [
        {
           name: 'name',
           desc: 'name for the new seed'
        },
        {
           name: 'source',
           desc: 'branch or commit to use'
        }
    ];

    return SeedManager;
});
