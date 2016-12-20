/**
 * Purpose unknown
 *
 * @param {unknown} path unknown
 * @param {unknown} applicationSource unknown
 *
 * @returns {unknown} unknown
 */
function getModelSource(path, applicationSource) {
    return applicationSource[path];
}

module.exports = {
    getModelSource: getModelSource
};
