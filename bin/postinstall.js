// run the compile command
'use strict';

var spawnSync = require('child_process').spawnSync,
    path = require('path'),
    babelPath = path.join(__dirname, '..', 'node_modules', 'babel', 'bin', 'babel'),
    fse = require('fs-extra'),
    deeplist = require('deep-readdir').deepReaddirSync,
    root = path.join(__dirname, '..'),
    srcRoot = path.join(root, 'src');

// Compile back to ES5
spawnSync('node', [babelPath, 'src', '-d', 'lib']);

// Copy the non-js files
deeplist(srcRoot)
    .filter(function(file) {
        return path.extname(file) !== '.js';
    })
    .forEach(function(file) {
        fse.copySync(file, file.replace(srcRoot, path.join(root, 'lib')));
    });
