'use strict';

var url = require('url');
var processContentRequest = require('./processContentRequest').processContentRequest;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} sendToLog unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function downloadRouter(sessions, hostName, controllers, nonObjTemplatelogLevel, sendToLog, req, resp, next) {

    var file = url.parse(req.url, true).query.file;

    if (req.url.match(/amorphic\/xhr\?path\=/) && file && req.method == 'GET') {
        processContentRequest(req, resp, sessions, hostName, controllers, nonObjTemplatelogLevel, sendToLog);
    }
    else {
        next();
    }
}


module.exports = {
    downloadRouter: downloadRouter
};
