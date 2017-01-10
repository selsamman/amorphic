'use strict';

// TODO: Make a SessionUtils

var AmorphicContext = require('../AmorphicContext');
var zlib = require('zlib');

/**
 * Purpose unknown
 *
 * @param {unknown} data unknown
 *
 * @returns {unknown} unknown
 */
function compressSessionData(data) {
    var amorphicOptions = AmorphicContext.amorphicOptions;
    if (amorphicOptions.compressSession) {
        return zlib.deflateSync(data);
    }

    return data;
}

module.exports = {
    compressSessionData: compressSessionData
};
