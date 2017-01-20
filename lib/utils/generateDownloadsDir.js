'use strict';

let fs = require('fs');
let path = require('path');

/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 *
 * @returns {unknown} unknown
 */
function generateDownloadsDir() {
    // Create temporary directory for file uploads
    let dloads = path.join(path.dirname(require.main.filename), 'download');

    if (!fs.existsSync(dloads)) {
        fs.mkdirSync(dloads);
    }

    let files = fs.readdirSync(dloads);

    for (let ix = 0; ix < files.length; ++ix) {
        fs.unlinkSync(path.join(dloads, files[ix]));
    }

    return dloads;
}

module.exports = {
    generateDownloadsDir: generateDownloadsDir
};
