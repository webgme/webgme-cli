[![Build Status](https://travis-ci.org/brollb/webgme-setup-tool.svg?branch=master)](https://travis-ci.org/brollb/webgme-cli)
# WebGME Setup Tool
The WebGME setup tool is a tool for managing WebGME apps. Specifically, it provides a command line interface for creating, removing, installing from other WebGME apps, (etc) for various WebGME components (currently addons and plugins are supported).

# Quick Start
First install the project with 

```
npm install -g brollb/webgme-setup-tool
```

Next, create a new WebGME app:

```
webgme init MyNewProject
```

Now, from the project root, you can start the WebGME app with `npm start`!

Additional useful commands include
```
webgme new plugin MyNewPlugin
webgme rm plugin MyNewPlugin
webgme add plugin CodeGenerator brollb/VisualConstraintLanguage

webgme new addOn MyNewAddOn
webgme rm addOn MyNewAddOn
```

