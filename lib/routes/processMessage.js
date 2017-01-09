'use strict';

var url = require('url');
var Logger = require('../utils/logger');
var log = Logger.log;
var getSessionCache = require('../session/getSessionCache').getSessionCache;
var establishServerSession = require('../session/establishServerSession').establishServerSession;
var displayPerformance = require('../utils/displayPerformance').displayPerformance;

/**
 * Process JSON request message
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} sessions unknown
 * @param {Number} nonObjTemplatelogLevel - The log level when using the non object template logger.
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} sendToLog unknown
 */
function processMessage(req, resp, sessions, nonObjTemplatelogLevel, hostName, controllers, sendToLog) {

    var session = req.session;
    var message = req.body;
    var path = url.parse(req.url, true).query.path;
    var sessionData = getSessionCache(path, req.session.id, false, sessions);

    if (!message.sequence) {
        log(1, req.session.id, 'ignoring non-sequenced message', nonObjTemplatelogLevel);
        resp.writeHead(500, {'Content-Type': 'text/plain'});
        resp.end('ignoring non-sequenced message');

        return;
    }

    var expectedSequence = sessionData.sequence || message.sequence;
    var newPage = message.type === 'refresh' || message.sequence !== expectedSequence;
    var forceReset = message.type === 'reset';

    establishServerSession(req, path, newPage, forceReset, message.rootId, sessions, hostName, controllers,
        nonObjTemplatelogLevel, sendToLog).then(function kk(semotus) {

            if (message.performanceLogging) {
                req.amorphicTracking.browser = message.performanceLogging;
            }

            semotus.objectTemplate.logger.setContextProps(message.loggingContext);

            var callContext = message.type;

            if (message.type === 'call') {
                callContext += '.' + message.id + '[' + message.name + ']';
            }

            var context = semotus.objectTemplate.logger.setContextProps({
                app: path,
                message: callContext,
                sequence: message.sequence,
                expectedSequence: sessionData.sequence,
                session: req.session.id,
                ipaddress: (String(req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') ||
            'unknown'
            });

            ++sessionData.sequence;

            var ourObjectTemplate = semotus.objectTemplate;
            var remoteSessionId = req.session.id;

            ourObjectTemplate.expireSession = function expoSession() {
                req.session.destroy();
                ourObjectTemplate.sessionExpired = true;
            };

            ourObjectTemplate.sessionExpired = false;
            var startMessageProcessing;

        // If we expired just return a message telling the client to reset itself
            if (semotus.newSession || newPage || forceReset) {
                if (semotus.newSession) {
                    ourObjectTemplate.logger.info({
                        component: 'amorphic',
                        module: 'processMessage',
                        activity: 'reset'
                    }, remoteSessionId,
                    'Force reset on ' + message.type + ' ' + 'new session' + ' [' + message.sequence + ']');
                }
                else {
                    ourObjectTemplate.logger.info({component: 'amorphic', module: 'processMessage', activity: 'reset'},
                    remoteSessionId, 'Force reset on ' + message.type + ' ' +  ' [' + message.sequence + ']');
                }

                semotus.save(path, session, req);
                startMessageProcessing = process.hrtime();

                var outbound = semotus.getMessage();

                outbound.ver = semotus.appVersion;
                ourObjectTemplate.logger.clearContextProps(context);
                resp.end(JSON.stringify(outbound));  // return a sync message assuming no queued messages

                for (var prop in ourObjectTemplate.logger.context) {
                    req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
                }

                req.amorphicTracking.addServerTask({name: 'Reset Processing'}, startMessageProcessing);
                sessionData.sequence = message.sequence + 1;
                displayPerformance(req);

                return;
            }

        // When Semotus sends a message it will either be a response or
        // a callback to the client.  In either case return a response and prevent
        // any further messages from being generated as these will get handled on
        // the next call into the server
            startMessageProcessing = process.hrtime();

            var sendMessage = function surndMessage(message) {
                ourObjectTemplate.setSession(remoteSessionId);
                ourObjectTemplate.enableSendMessage(false);
                req.amorphicTracking.addServerTask({name: 'Request Processing'}, startMessageProcessing);
                semotus.save(path, session, req);
                message.ver = semotus.appVersion;
                message.sessionExpired = ourObjectTemplate.sessionExpired;

                var respstr = JSON.stringify(message);

                for (var prop in ourObjectTemplate.logger.context) {
                    req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
                }

                ourObjectTemplate.logger.clearContextProps(context);
                resp.end(respstr);
                displayPerformance(req);
            };

            ourObjectTemplate.incomingIP = (String(req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

            // Enable the sending of the message in the response
            ourObjectTemplate.enableSendMessage(true, sendMessage);

            try {
                ourObjectTemplate.processMessage(message, null, semotus.restoreSession);
            }
        catch (error) {
            ourObjectTemplate.logger.info({
                component: 'amorphic',
                module: 'processMessage',
                activity: 'error'}, error.message + error.stack);

            resp.writeHead(500, {'Content-Type': 'text/plain'});
            ourObjectTemplate.logger.clearContextProps(context);
            resp.end(error.toString());
        }

        }).catch(function failure(error) {
            log(0, req.session.id, error.message + error.stack, nonObjTemplatelogLevel);
            resp.writeHead(500, {'Content-Type': 'text/plain'});
            resp.end(error.toString());
        }).done();
}

module.exports = {
    processMessage: processMessage
};
