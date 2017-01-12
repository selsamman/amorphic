'use strict';

let processLoggingMessage = require('../routes/processLoggingMessage').processLoggingMessage;
let processMessage = require('../routes/processMessage').processMessage;

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */

function router(sessions, nonObjTemplatelogLevel, controllers, req, resp, next) {

    if (req.url.match(/amorphic\/xhr\?path\=/)) {
        if (req.body.type === 'logging') {
            processLoggingMessage(req, resp);
        }
        else {
            processMessage(req, resp, sessions, nonObjTemplatelogLevel, controllers);
        }
    }
    else {
        next();
    }
}

module.exports = {
    router: router
};
