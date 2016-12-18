var zlib = require('zlib');


/**
 * Purpose unknown
 *
 * @param {unknown} data unknown
 * @param {unknown} amorphicOptions unknown
 *
 * @returns {unknown} unknown
 */
function compressSessionData(data, amorphicOptions) {
    if (amorphicOptions.compressSession) {
        return zlib.deflateSync(data);
    }

    return data;
}

module.exports = {
    compressSessionData: compressSessionData
};
