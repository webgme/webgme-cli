[![Version](https://badge.fury.io/js/webgme-cli.svg)](https://www.npmjs.com/package/webgme-cli)
[![Build Status](https://travis-ci.org/webgme/webgme-cli.svg?branch=master)](https://travis-ci.org/webgme/webgme-cli)
[![Code Climate](https://codeclimate.com/github/webgme/webgme-cli/badges/gpa.svg)](https://codeclimate.com/github/webgme/webgme-cli)
[![Stories in Ready](https://badge.waffle.io/webgme/webgme-cli.png?label=ready&title=Ready)](https://waffle.io/webgme/webgme-cli)

# WebGME CLI
The WebGME cli is a tool for managing WebGME apps. Specifically, it provides a command line interface for creating, removing, installing from other WebGME apps, (etc) for various WebGME components.

To view a listing of components and applications that have been published on npmjs and are openly and freely available check out [the list of extensions at webgme.org](https://webgme.org/?tab=extensions).

A "component" in webgme is general term for one of the following:
- [plugin](https://github.com/webgme/webgme/wiki/GME-Plugins)
- [decorator](https://github.com/webgme/webgme/wiki/GME-Decorators)
- [visualizer](https://github.com/webgme/webgme/wiki/GME-Visualizers)
- addon - event driven logic running on the server w/ access to the model
- seed - a project used as a template for new webgme models
- [router](https://github.com/webgme/webgme/wiki/REST-Routers) - express router providing additional REST endpoints
- layout

# Quick Start
If this is your first time using webgme and webgme-cli the steps at [Getting Started section](https://webgme.readthedocs.io/en/latest/) are slightly more detailed.
## Installing webgme-cli
First, install NodeJS using [nvm](https://github.com/creationix/nvm). Then install NodeJS >= 8:
```
nvm install 8
```
Now, install webgme-cli using `npm`:

```
npm install -g webgme-cli
```

## Setting up a WebGME app
Create a new WebGME app:

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
webgme new addon MyNewAddOn

webgme ls

webgme rm MyNewPlugin
webgme rm MyNewAddOn
```

It currently supports adding plugins or addons from npm or github repositories which are either created with this tool or contain a WebGME `config.js` file in the project root:

```
webgme import plugin <plugin> <project>
```

where `<project>` is either `<github user>/<github repo>` or the npm project name.

# FAQ

+ __Tried loading "coreplugins/XXXXGenerator/XXXXGenerator" at xxxxx/src/../node_modules/webgme/src/plugin/coreplugins/...__

    + This usually happens after updating a clone of the webgme-cli and is caused by an outdated version of the webgme. That is, this happens when the webgme-cli has been updated to support a feature that isn't supported in the currently installed webgme dependency. Running `npm update` from the project root should fix it.
