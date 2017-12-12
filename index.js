// cli usage for webgme-cli
var webgme = {};

[
    require('./lib/PluginManager'),
    require('./lib/AddonManager'),
    require('./lib/SeedManager'),
    require('./lib/LayoutManager'),
    require('./lib/DecoratorManager'),
    require('./lib/RouterManager'),
    require('./lib/VisualizerManager')
].forEach(function(Component) {
    var component = new Component();
    webgme[component._name] = component;
});

module.exports = webgme;
