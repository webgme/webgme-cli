const path = require("path");

// Print message about the argument completion
console.log(
  "Note: Autocomplete for bash can be enabled with:\n\n" +
    '\techo ". ' +
    path.join(__dirname, "..", "extra", "webgme.completion.bash") +
    '" >> ~/.bashrc\n'
);
