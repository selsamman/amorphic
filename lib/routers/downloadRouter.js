'use strict';

let url = require('url');
let processContentRequest = require('../routes/processContentRequest').processContentRequest;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */

function downloadRouter(sessions, controllers, nonObjTemplatelogLevel, req, resp, next) {
    let file = url.parse(req.url, true).query.file;

    if (req.url.match(/amorphic\/xhr\?path\=/) && file && req.method === 'GET') {
        processContentRequest(req, resp, sessions, controllers, nonObjTemplatelogLevel);
    }
    else {
        next();
    }
}


module.exports = {
    downloadRouter: downloadRouter
};
