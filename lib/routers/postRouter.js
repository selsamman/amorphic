'use strict';

let url = require('url');
let processPost = require('../routes/processPost').processPost;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function postRouter(sessions, controllers, req, resp, next) {

    if (req.url.match(/amorphic\/xhr\?path\=/) && url.parse(req.url, true).query.form && req.method === 'POST') {
        processPost(req, resp, sessions, controllers);
    }
    else {
        next();
    }
}

module.exports = {
    postRouter: postRouter
};
