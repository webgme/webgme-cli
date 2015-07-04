define([], function() {
    var PROJECT_CONFIG = '.webgme';
    var fs = require('fs');
    var path = require('path');

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

    var getConfigFile = function() {
    };

    return {
        getRootPath: getRootPath,
        saveFilesFromBlobClient: saveFilesFromBlobClient
    };
});
