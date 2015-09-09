/*jshint node: true*/
// This is a lightweight wrapper around the event emitter to allow
// for easy log levels and testing (without some of the "info:" tags,
// etc, of some of the other loggers)
'use strict';

var EventEmitter = require('events').EventEmitter,
    LOG_LEVELS = ['error', 'write', 'info', 'debug', 'trace', 'silly'];

var Logger = function() {
    this._emitter = new EventEmitter();

    // Set up event listeners
    this.loglevel = 1;
    var level;
    for (var i = LOG_LEVELS.length; i--;) {
        level = LOG_LEVELS[i];
        this._addLogLevel(i);  // add listener
        // Add the emitter
        this[level] = this._emitter.emit.bind(this._emitter, level);
        this[level+'Stream'] = this._setLogStream.bind(this, i);
    }
};

Logger.prototype._addLogLevel = function(level) {
    var name = LOG_LEVELS[level];
    this._emitter.on(name, this._onLogEvent.bind(this, level));
};

Logger.prototype._onLogEvent = function(level, message) {
    if (level <= this.loglevel) {
        console.log(message);
    }
};

Logger.prototype.setLogLevel = function(name) {
    var level = LOG_LEVELS.indexOf(name);
    if (level !== -1) {
        this.loglevel = level;
    }
};

Logger.prototype._setLogStream = function(level, stream) {
    var self = this,
        text = '',
        name = LOG_LEVELS[level];

    // Print out the data one chunk at a time
    stream.on('data', function(newText) {
        text += newText.toString();
        var i = text.lastIndexOf('\n');
        if (i > -1) {
            self[name](text.substring(0,i));
            text = text.substring(i+1);
        }
    });
    // Print any last chunk
    stream.on('end', function() {
        if (text) {
            self[name](text);
        }
    });
};

module.exports = Logger;
