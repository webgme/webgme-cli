/*
 * This is used to "shim" WebGME BlobClient into the WebGME cli tool.
 */

define([], function() {
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

    var BlobClient = function() {
        this.artifacts = {};
    };

    BlobClient.prototype.createArtifact = function(name) {
        return this.artifacts[name] = new Artifact(name);  //jshint ignore: line
    };

    BlobClient.prototype.saveAllArtifacts = function(callback) {
        callback(null, Object.keys(this.artifacts));
    };

    return BlobClient;
});
