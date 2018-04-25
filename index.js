// cli usage for webgme-cli
var Q = require('q');
var utils = require('./src/utils');
var _ = require('lodash');

var webgme = {};

[
    require('./src/PluginManager'),
    require('./src/AddonManager'),
    require('./src/SeedManager'),
    require('./src/LayoutManager'),
    require('./src/DecoratorManager'),
    require('./src/RouterManager'),
    require('./src/VisualizerManager')
].forEach(function(Component) {
    var component = new Component();
    webgme[component._name] = component;
});

// Add 'all' option
webgme.all = {};
webgme.all.import = function(projectName, opts, callback) {
    let rootPath;

    opts = opts || {};
    return Q()
        .then(() => {  // ensure in a webgme app dir. Move to the root.
            rootPath = utils.getRootPath();
            if (!rootPath) {
                throw new Error('Could not find a project in current or any parent directories');
            }
            process.chdir(rootPath);
        })
        .then(() => {  // install the project
            let deferred = Q.defer();
            utils.installProject(projectName, false, (err, config) => {
                if (err) return deferred.reject(err);
                deferred.resolve(config);
            });
            return deferred.promise;
        })
        .then(() => utils.getPackageName(projectName))
        .then(projectName => {  // read in the webgme-cli config for the given project
            projectName = opts.packageName || projectName;
            projectName = projectName.toLowerCase();
            let configPath = utils.getConfigPath(projectName);
            let config = require(configPath);
            return config;
        })
        .then(config => {  // import each of the components
            const components = config.components;
            const types = Object.keys(components);
            return Q.all(types.map(type => {
                const managerId = type.replace(/s$/, '');  // make it singular...
                const names = Object.keys(components[type]);
                const imports = names.map(name => {
                    const args = {
                        name: name,
                        project: projectName,
                        skipInstall: true
                    };
                    return webgme[managerId].import(args);
                });
                return Q.all(imports);
            }))
            .then(() => config);
        })
        .then(config => {  // import-all on each of the dependencies
            const deps = config.dependencies;
            const types = Object.keys(deps);
            const allProjects = types
                .map(type => {
                    const names = Object.keys(deps[type]);
                    return names.map(name => deps[type][name].project);
                })
                .reduce((l1, l2) => l1.concat(l2), []);
            const projects = _.uniq(allProjects);
            return Q.all(projects.map(project => webgme.all.import(project)));
        })
        .nodeify(callback);
};

module.exports = webgme;
