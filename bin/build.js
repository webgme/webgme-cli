// run the compile command
'use strict';

var spawnSync = require('child_process').spawnSync,
    path = require('path'),
    babelPath = path.join(__dirname, '..', 'node_modules', 'babel', 'bin', 'babel'),
    fse = require('fs-extra'),
    deeplist = require('deep-readdir').deepReaddirSync,
    root = path.join(__dirname, '..'),
    from = process.argv[2],
    to = process.argv[3],
    srcRoot = path.join(root, from);

// Compile back to ES5
var res = spawnSync('node', [babelPath, from, '-d', to]);
console.log(res.stdout.toString());
console.error(res.stderr.toString());

// Copy the non-js files
deeplist(srcRoot)
    .filter(function(file) {
        return path.extname(file) !== '.js';
    })
    .forEach(function(file) {
        fse.copySync(file, file.replace(srcRoot, path.join(root, to)));
    });
