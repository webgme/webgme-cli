[![Build Status](https://travis-ci.org/webgme/webgme-cli.svg?branch=master)](https://travis-ci.org/webgme/webgme-cli)
[![Version](https://badge.fury.io/js/webgme-cli.svg)](https://www.npmjs.com/package/webgme-cli)
[![Stories in Ready](https://badge.waffle.io/webgme/webgme-cli.png?label=ready&title=Ready)](https://waffle.io/webgme/webgme-cli)

# WebGME CLI
The WebGME cli is a tool for managing WebGME apps. Specifically, it provides a command line interface for creating, removing, installing from other WebGME apps, (etc) for various WebGME components (currently addons and plugins are supported).

# Quick Start
WebGME apps require [NodeJS](https://nodejs.org/en/download/) and [MongDB](https://www.mongodb.org/downloads#production) installed on the host system (the server).

## Setting up a WebGME app
First install the project with 

```
npm install -g webgme-cli
```

Next, create a new WebGME app:

```
webgme init MyNewProject
```

Navigate to the project folder and install dependencies:

```
cd MyNewProject
webgme start
```

Now, open a browser and navigate to `http://localhost:8888` to get started!

## Creating custom WebGME components
Additional useful commands include
```
webgme new plugin MyNewPlugin
webgme ls plugin
webgme rm plugin MyNewPlugin

webgme new addon MyNewAddOn
webgme rm addon MyNewAddOn
```

It currently supports adding plugins or addons from github repositories which are either created with this tool or contain a WebGME `config.js` file in the project root:

```
webgme add plugin <plugin> <github user>/<github project>
```

# FAQ

+ __Tried loading "coreplugins/XXXXGenerator/XXXXGenerator" at xxxxx/src/../node_modules/webgme/src/plugin/coreplugins/...__

    + This usually happens after updating a clone of the webgme-cli and is caused by an outdated version of the webgme. That is, this happens when the webgme-cli has been updated to support a feature that isn't supported in the currently installed webgme dependency. Running `npm update` from the project root should fix it.
