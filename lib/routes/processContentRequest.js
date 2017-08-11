'use strict';

let url = require('url');
let establishServerSession = require('../session/establishServerSession').establishServerSession;

/**
 * Purpose unknown
 *
 * @param {unknown} request unknown
 * @param {unknown} response unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 */
function processContentRequest(request, response, sessions, controllers, nonObjTemplatelogLevel) {

    let path = url.parse(request.url, true).query.path;

    establishServerSession(request, path, false, false, null, sessions, controllers,
        nonObjTemplatelogLevel).then(function zz(semotus) {
            if (typeof(semotus.objectTemplate.controller.onContentRequest) === 'function') {
                semotus.objectTemplate.controller.onContentRequest(request, response);
            }
        });
}

module.exports = {
    processContentRequest: processContentRequest
};
