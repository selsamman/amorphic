'use strict';

let url = require('url');
let processFile = require('../routes/processFile').processFile;

/**
 * Purpose unknown
 *
 * @param {unknown} downloads unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function uploadRouter(downloads, req, resp, next) {
    if (req.url.match(/amorphic\/xhr\?path\=/) && url.parse(req.url, true).query.file && req.method === 'POST') {
        processFile(req, resp, next, downloads);
    }
    else {
        next();
    }
}

module.exports = {
    uploadRouter: uploadRouter
};
