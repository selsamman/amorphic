/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} applicationSourceMap unknown
 *
 * @returns {unknown} unknown
 */
function getModelSourceMap(path, applicationSourceMap) {
    return applicationSourceMap[path];
}

module.exports = {
    getModelSourceMap: getModelSourceMap
};
