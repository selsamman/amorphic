var zlib = require('zlib');

/**
 * Purpose unknown
 *
 * @param {unknown} objData unknown
 * @param {unknown} amorphicOptions unknown
 *
 * @returns {unknown} unknown
 */
function decompressSessionData(objData, amorphicOptions) {
    if (amorphicOptions.compressSession && objData.data) {
        var buffer = new Buffer(objData.data);

        return zlib.inflateSync(buffer);
    }

    return objData;
}

module.exports = {
    decompressSessionData: decompressSessionData
};
