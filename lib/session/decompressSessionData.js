'use strict';

let AmorphicContext = require('../AmorphicContext');
let zlib = require('zlib');

/**
 * Purpose unknown
 *
 * @param {unknown} objData unknown
 *
 * @returns {unknown} unknown
 */
function decompressSessionData(objData) {
    let amorphicOptions = AmorphicContext.amorphicOptions;
    if (amorphicOptions.compressSession && objData.data) {
        let buffer = new Buffer(objData.data);

        return zlib.inflateSync(buffer);
    }

    return objData;
}

module.exports = {
    decompressSessionData: decompressSessionData
};
