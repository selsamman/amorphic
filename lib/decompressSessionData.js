'use strict';

var AmorphicContext = require('./AmorphicContext');
var zlib = require('zlib');

/**
 * Purpose unknown
 *
 * @param {unknown} objData unknown
 *
 * @returns {unknown} unknown
 */
function decompressSessionData(objData) {
    var amorphicOptions = AmorphicContext.amorphicOptions;
    if (amorphicOptions.compressSession && objData.data) {
        var buffer = new Buffer(objData.data);

        return zlib.inflateSync(buffer);
    }

    return objData;
}

module.exports = {
    decompressSessionData: decompressSessionData
};
