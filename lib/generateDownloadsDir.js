var fs = require('fs');
var processMessage = require('./processMessage').processMessage;


/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 *
 * @returns {unknown} unknown
 */
function generateDownloadsDir(path) {
    // Create temporary directory for file uploads
    var dloads = path.join(path.dirname(require.main.filename), 'download');
    
    if (!fs.existsSync(dloads)) {
        fs.mkdirSync(dloads);
    }
    
    var files = fs.readdirSync(dloads);
    
    for (var ix = 0; ix < files.length; ++ix) {
        fs.unlinkSync(path.join(dloads, files[ix]));
    }
    
    return dloads;
}

module.exports = {
    generateDownloadsDir: generateDownloadsDir
};
