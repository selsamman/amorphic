'use strict';

let url = require('url');
let establishServerSession = require('../session/establishServerSession').establishServerSession;
let Logger = require('../utils/logger');
let logMessage = Logger.logMessage;
let Bluebird = require('bluebird');

/**
 * Process a post request by establishing a session and calling the controllers processPost method
 * which can return a response to be sent back
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 */

function processPost(req, resp, sessions, controllers, nonObjTemplatelogLevel) {

    let session = req.session;
    let path = url.parse(req.url, true).query.path;

    establishServerSession(req, path, false, false, null, sessions, controllers, nonObjTemplatelogLevel)
        .then(function ff(semotus) {

            let ourObjectTemplate = semotus.objectTemplate;
            let remoteSessionId = req.session.id;

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
