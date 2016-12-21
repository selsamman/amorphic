'use strict';

var url = require('url');
var establishServerSession = require('./establishServerSession').establishServerSession;

/**
 * Purpose unknown
 *
 * @param {unknown} request unknown
 * @param {unknown} response unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} sessions unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} sendToLog unknown
 */
function processContentRequest(request, response, applicationConfig, sessions, amorphicOptions, applicationSource,
                               applicationSourceMap, applicationPersistorProps, hostName, controllers,
                               nonObjTemplatelogLevel, sendToLog) {

    var path = url.parse(request.url, true).query.path;

    establishServerSession(request, path, false, false, null, applicationConfig, sessions, amorphicOptions,
        applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers,
        nonObjTemplatelogLevel, sendToLog).then(function zz(semotus) {

            if (typeof(semotus.objectTemplate.controller.onContentRequest) == 'function') {
                semotus.objectTemplate.controller.onContentRequest(request, response);
            }
        });
}

module.exports = {
    processContentRequest: processContentRequest
};
