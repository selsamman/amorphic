'use strict';

var url = require('url');
var processPost = require('../routes/processPost').processPost;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {Number} nonObjTemplatelogLevel - The log level when using the non object template logger.
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function postRouter(sessions, hostName, controllers, nonObjTemplatelogLevel, req, resp, next) {

    if (req.url.match(/amorphic\/xhr\?path\=/) && url.parse(req.url, true).query.form && req.method === 'POST') {
        processPost(req, resp, sessions, hostName, controllers, nonObjTemplatelogLevel);
    }
    else {
        next();
    }
}

module.exports = {
    postRouter: postRouter
};
