'use strict';

var processLoggingMessage = require('./processLoggingMessage').processLoggingMessage;
var processMessage = require('./processMessage').processMessage;

/**
 * Purpose unknown
 *
 * @param {unknown} hostName unknown
 * @param {unknown} sendToLog unknown
 * @param {unknown} sessions unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function router(hostName, sendToLog, sessions, nonObjTemplatelogLevel, controllers, req, resp, next) {

    if (req.url.match(/amorphic\/xhr\?path\=/)) {
        if (req.body.type == 'logging') {
            processLoggingMessage(req, resp, hostName, sendToLog);
        }
        else {
            processMessage(req, resp, sessions, nonObjTemplatelogLevel, hostName, controllers, sendToLog);
        }
    }
    else {
        next();
    }
}

module.exports = {
    router: router
};
