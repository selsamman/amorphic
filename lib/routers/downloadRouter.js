'use strict';

var url = require('url');
var processContentRequest = require('../routes/processContentRequest').processContentRequest;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {Number} nonObjTemplatelogLevel - The log level when using the non object template logger.
 * @param {unknown} sendToLog unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function downloadRouter(sessions, hostName, controllers, nonObjTemplatelogLevel, sendToLog, req, resp, next) {

    var file = url.parse(req.url, true).query.file;

    if (req.url.match(/amorphic\/xhr\?path\=/) && file && req.method === 'GET') {
        processContentRequest(req, resp, sessions, hostName, controllers, nonObjTemplatelogLevel, sendToLog);
    }
    else {
        next();
    }
}


module.exports = {
    downloadRouter: downloadRouter
};
