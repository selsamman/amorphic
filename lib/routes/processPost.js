'use strict';

var url = require('url');
var establishServerSession = require('../session/establishServerSession').establishServerSession;
var Utils = require('../util/utils');
var logMessage = Utils.logMessage;
var Bluebird = require('bluebird');

/**
 * Process a post request by establishing a session and calling the controllers processPost method
 * which can return a response to be sent back
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} sessions unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {Number} nonObjTemplatelogLevel - The log level when using the non object template logger.
 * @param {unknown} sendToLog unknown
 */
function processPost(req, resp, sessions, hostName, controllers, nonObjTemplatelogLevel, sendToLog) {

    var session = req.session;
    var path = url.parse(req.url, true).query.path;

    establishServerSession(req, path, false, false, null, sessions, hostName, controllers, nonObjTemplatelogLevel,
        sendToLog)
        .then(function ff(semotus) {

            var ourObjectTemplate = semotus.objectTemplate;
            var remoteSessionId = req.session.id;

            if (typeof(ourObjectTemplate.controller.processPost) === 'function') {
                Bluebird.resolve(ourObjectTemplate.controller.processPost(null, req.body))
                    .then(function gg(controllerResp) {
                        ourObjectTemplate.setSession(remoteSessionId);
                        semotus.save(path, session, req);
                        resp.writeHead(controllerResp.status, controllerResp.headers || {'Content-Type': 'text/plain'});
                        resp.end(controllerResp.body);
                    })
                    .catch(function hh(e) {
                        ourObjectTemplate.logger.info({
                            component: 'amorphic',
                            module: 'processPost', activity: 'error'
                        }, 'Error ' + e.message + e.stack);

                        resp.writeHead(500, {'Content-Type': 'text/plain'});
                        resp.end('Internal Error');
                    });
            }
            else {
                throw 'Not Accepting Posts';
            }
        })
        .catch(function ii(error) {
            logMessage('Error establishing session for processPost ', req.session.id, error.message + error.stack);
            resp.writeHead(500, {'Content-Type': 'text/plain'});
            resp.end('Internal Error');
        });
}

module.exports = {
    processPost: processPost
};
