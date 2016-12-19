var fs = require('fs');

// TODO: Refactor this to be a readSchema function
/**
 * Purpose unknown
 *
 * @param {unknown} file unknown
 *
 * @returns {unknown} unknown
 */
function readFile(file) {
    
    if (file && fs.existsSync(file)) {
        return fs.readFileSync(file);
    }
    
    return null;
}

module.exports = {
    readFile: readFile
};
