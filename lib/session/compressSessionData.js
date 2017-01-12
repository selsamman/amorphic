'use strict';

// TODO: Make a SessionUtils

let AmorphicContext = require('../AmorphicContext');
let zlib = require('zlib');

/**
 * Purpose unknown
 *
 * @param {unknown} data unknown
 *
 * @returns {unknown} unknown
 */
function compressSessionData(data) {
    let amorphicOptions = AmorphicContext.amorphicOptions;
    if (amorphicOptions.compressSession) {
        return zlib.deflateSync(data);
    }

    return data;
}

module.exports = {
    compressSessionData: compressSessionData
};
