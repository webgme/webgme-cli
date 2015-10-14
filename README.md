[![Build Status](https://travis-ci.org/webgme/webgme-setup-tool.svg?branch=master)](https://travis-ci.org/webgme/webgme-setup-tool)
# WebGME Setup Tool
The WebGME setup tool is a tool for managing WebGME apps. Specifically, it provides a command line interface for creating, removing, installing from other WebGME apps, (etc) for various WebGME components (currently addons and plugins are supported).

# Quick Start
First install the project with 

```
npm install -g webgme-setup-tool
```

Next, create a new WebGME app:

```
webgme init MyNewProject
```

Now, from the project root, you can start the WebGME app with `npm start`!

Additional useful commands include
```
webgme new plugin MyNewPlugin
webgme ls plugin
webgme rm plugin MyNewPlugin

webgme new addOn MyNewAddOn
webgme rm addOn MyNewAddOn
```

It currently supports adding plugins or addons from github repositories which are either created with this tool or contain a WebGME `config.js` file in the project root:

```
webgme add plugin <plugin> <github user>/<github project>
```

