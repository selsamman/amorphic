// This file is for testing amorphic when checked out as a project
// Add an amorphic entry in node_modules that points to us
path = require('path');
fs = require('fs');
var amDir = path.join(path.dirname(require.main.filename), "node_modules/amorphic");
if (!fs.existsSync(amDir))
    fs.mkdirSync(amDir);
fs.writeFileSync(path.join(amDir, "index.js"), "module.exports = require('../../index.js')");
fs.writeFileSync(path.join(amDir, "client.js"), fs.readFileSync(__dirname + '/client.js'));

require('amorphic').listen(__dirname);
