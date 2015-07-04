define([], function() {
    'use strict';
    var Logger = function(emitter) {
       this._emitter = emitter;
    };

    Logger.prototype.debug = function(text) {
        this._emitter.emit('debug', text);
    };

    Logger.prototype.info = function(text) {
        this._emitter.emit('info', text);
    };

    return Logger;
});
