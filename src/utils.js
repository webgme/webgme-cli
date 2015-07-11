define(['lodash', 
        'fs',
        'path',
        'module',
        'ramda'], function(_, 
                           fs,
                           path,
                           module,
                           R) {

    var PROJECT_CONFIG = '.webgme.json',
        __dirname = path.dirname(module.uri);

    var getRootPath = function() {
        // Walk back from current path until you find a .webgme file
        var abspath = path.resolve('.'),
            dirs;

        while (abspath.length > 1) {
            if (isProjectRoot(abspath)) {
                return abspath;
            }
            dirs = abspath.split(path.sep);
            dirs.pop();
            abspath = dirs.join(path.sep);
        }
        return null;
    };

    var isProjectRoot = function(abspath) {
        // Check for .webgme file
        files = fs.readdirSync(abspath);
        return files.filter(function(file) {
            return file === PROJECT_CONFIG;
        });
    };

    /**
     * Save file and create directories as needed.
     *
     * @param {File} file
     * @return {undefined}
     */
    var saveFile = function(file) {
        var dir = path.dirname(file.name);

        createDir(dir);
        fs.writeFileSync(file.name, file.content);
    };

    /**
     * Create directory as needed.
     *
     * @param {String} dir
     * @return {undefined}
     */
    var createDir = function(dir) {
        var dirs = path.resolve(dir).split(path.sep),
            shortDir,
            i = 1;

        while (i++ < dirs.length) {
            shortDir = dirs.slice(0,i).join(path.sep);
            if (!fs.existsSync(shortDir)) {
                fs.mkdirSync(shortDir);
            }
        }
    };

    var saveFilesFromBlobClient = function(blobClient) {
        var artifactNames = Object.keys(blobClient.artifacts);
        for (var i = artifactNames.length; i--;) {
            blobClient.artifacts[artifactNames[i]].files.forEach(saveFile);
        }
    };

    /* * * * * * * Config Settings * * * * * * * */
    var getConfig = function() {
        var root = getRootPath();
        var config = fs.readFileSync(path.join(root, PROJECT_CONFIG));
        return JSON.parse(config);
    };

    var saveConfig = function(config) {
        var root = getRootPath();
        var configText = JSON.stringify(config);
        fs.writeFileSync(path.join(root, PROJECT_CONFIG), configText);
    };

    /**
     * Update the WebGME config based on the paths in the .webgme.json. 
     * It will pass the name of the 
     *
     * @return {undefined}
     */
    var updateWebGMEConfig = function() {
        var content = getWebGMEConfigContent(),
            templatePath = path.join(__dirname, 'res', 'config.template.js'),
            template = _.template(fs.readFileSync(templatePath)),
            configPath = path.join(getRootPath(), 'config.webgme.js');

        fs.writeFileSync(configPath, template(content));
    };

    /**
     * Get the paths from a config (sub) object such as "components" or 
     * "dependencies"
     *
     * @param {Object} config
     * @return {String[]}
     */
    var getPathsFromConfigGroup = function(config) {
        return R.mapObj(function(componentType) {
            return R.values(componentType).map(function(component) {
                return path.dirname(component.srcPath || component.path);
            });
        }, config);
    };

    var getWebGMEConfigContent = function() {
        var arrays,
            config = getConfig(),
            paths = {},
            configGroupPaths = ['components', 'dependencies']
                .map(function(type) {
                    return getPathsFromConfigGroup(config[type]);
                }
            );

        // Merge the arrays for each componentType
        var componentTypes = Object.keys(configGroupPaths[0]);
        for (var i = componentTypes.length; i--;) {
            // Get all paths for the component type (eg, plugins)
            arrays = configGroupPaths.map(function(group) {
                return group[componentTypes[i]];
            });
            // Merge all paths
            paths[componentTypes[i]] = arrays.reduce(R.concat);
        }

        return paths;
    };

    var loadConfig = function(project) {
        var configPath,
            config;

        configPath = path.join(getRootPath(), 'node_modules', 
            project, '.webgme.json');
        config = fs.readFileSync(configPath);
        return JSON.parse(config);
    };

    var nop = function() {};

    return {
        saveConfig: saveConfig,
        getConfig: getConfig,
        getRootPath: getRootPath,
        nop: nop,
        loadConfig: loadConfig,
        updateWebGMEConfig: updateWebGMEConfig,
        saveFilesFromBlobClient: saveFilesFromBlobClient
    };
});
