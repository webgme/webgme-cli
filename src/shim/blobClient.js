/*
 * This is used to "shim" WebGME BlobClient into the WebGME cli tool.
 */

'use strict';

var Artifact = function(name) {
    this.name = name;
    this.files = [];
};

Artifact.prototype.addFile = function(key, file, callback) {
    this.files.push({name: key, content: file});
    if (callback !== undefined) {
        callback(null);
    }
};

Artifact.prototype.addFiles = function(filesToAdd, callback) {
    var names = Object.keys(filesToAdd),
        len = names.length,
        error = null,
        cb = function(err) {
            error = err || error;
            if (error) {
                return callback(error);
            }
            if (--len === 0) {
                return callback(null);
            }
        };

    for (var i = names.length; i--;) {
        this.addFile(names[i], filesToAdd[names[i]], cb);
    }
};

Artifact.prototype.save = function(callback) {
    callback(null);
};

var BlobClient = function() {
    this.artifacts = {};
};

BlobClient.prototype.createArtifact = function(name) {
    return this.artifacts[name] = new Artifact(name);  //jshint ignore: line
};

BlobClient.prototype.saveAllArtifacts = function(callback) {
    callback(null, Object.keys(this.artifacts));
};

module.exports = BlobClient;
