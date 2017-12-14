/*globals describe,it,before,beforeEach,after*/
var PluginHelpers = require('../lib/shim/PluginHelpers'),
    assert = require('assert');

var checkType = function(args, option) {
    'use strict';
    
    it('should have correct type for '+option.name, function() {
        var value = args[option.name];
        if (value) {
            assert.equal(typeof value, option.valueType, 
                value+' is not of type '+option.valueType);
        }
    });
};

describe('plugin helpers', function() {
    'use strict';

    var rawConfig = require('./res/rawConfigExample'),
        args = require('./res/exampleArgs');

    describe('getConfig', function() {
        var results = PluginHelpers.getConfig(rawConfig, args);

        it('should have pluginID "AnotherPlugin"', function() {
            assert.equal(results.pluginID, 'AnotherPlugin');
        });

        rawConfig.forEach(checkType.bind(null, results));
    });
});
