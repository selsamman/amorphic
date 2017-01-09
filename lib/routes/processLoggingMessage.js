'use strict';

var AmorphicContext = require('../AmorphicContext');
var Logger = require('../utils/logger');
var getLoggingContext = Logger.getLoggingContext;
var setupLogger = Logger.setupLogger;
var url = require('url');
var persistor = require('persistor');
var semotus = require('semotus');

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} hostName unknown
 * @param {unknown} sendToLog unknown
 */
function processLoggingMessage(req, resp, hostName, sendToLog) {
    var applicationConfig = AmorphicContext.applicationConfig;
    var path = url.parse(req.url, true).query.path;
    var session = req.session;
    var message = req.body;
    var persistableSemotableTemplate = persistor(null, null, semotus);

    if (!session.semotus) {
        session.semotus = {controllers: {}, loggingContext: {}};
    }

    if (!session.semotus.loggingContext[path]) {
        session.semotus.loggingContext[path] = getLoggingContext(path, null, hostName);
    }

    // TODO why can't appConfig be taken out here?
    setupLogger(persistableSemotableTemplate.logger, path, session.semotus.loggingContext[path],
        applicationConfig, sendToLog);

    persistableSemotableTemplate.logger.setContextProps(message.loggingContext);

    persistableSemotableTemplate.logger.setContextProps({
        session: req.session.id,
        ipaddress: (String(req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown'});

    message.loggingData.from = 'browser';
    persistableSemotableTemplate.logger[message.loggingLevel](message.loggingData);
    resp.writeHead(200, {'Content-Type': 'text/plain'});
    resp.end('');
}

module.exports = {
    processLoggingMessage: processLoggingMessage
};
