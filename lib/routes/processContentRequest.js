'use strict';

var url = require('url');
var establishServerSession = require('../session/establishServerSession').establishServerSession;

/**
 * Purpose unknown
 *
 * @param {unknown} request unknown
 * @param {unknown} response unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {Number} nonObjTemplatelogLevel - The log level when using the non object template logger.
 * @param {unknown} sendToLog unknown
 */
function processContentRequest(request, response, sessions, controllers, nonObjTemplatelogLevel, sendToLog) {

    var path = url.parse(request.url, true).query.path;

    establishServerSession(request, path, false, false, null, sessions, controllers,
        nonObjTemplatelogLevel, sendToLog).then(function zz(semotus) {

            if (typeof(semotus.objectTemplate.controller.onContentRequest) === 'function') {
                semotus.objectTemplate.controller.onContentRequest(request, response);
            }
        });
}

module.exports = {
    processContentRequest: processContentRequest
};
