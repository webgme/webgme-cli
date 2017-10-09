
'use strict';

var spawnSync = require('child_process').spawnSync,
    path = require('path');

// Run the build on the src
var res = spawnSync('node', [path.join(__dirname, 'build.js'), 'src', 'lib']);
console.log(res.stdout.toString());
console.error(res.stderr.toString());

// Print message about the argument completion
console.log('Note: Autocomplete for bash can be enabled with:\n\n' +
    '\techo ". ' + path.join(__dirname, '..', 'extra', 'webgme.completion.bash') +
    '" >> ~/.bashrc\n');
