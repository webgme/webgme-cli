/*
 * This is the basic structure for component managers
 *
 * In the component manager, all public functions (functions not preceded by a _)
 * are assumed to be actions accepted from the command line.
 *
 * Note: "init" is a reserved action and cannot be used by the ComponentManager
 */

define([], function() {
    'use strict';

    var ComponentManager = function(emitter) {
        this._emitter = emitter;
    };

    return ComponentManager;
});
