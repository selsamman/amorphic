var Utils = require('./utils');
var getLoggingContext = Utils.getLoggingContext;
var setupLogger = Utils.setupLogger;
var url = require('url');
var Persistor = require('persistor');
var Semotus = require('semotus');

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} hostName unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} sendToLog unknown
 */
function processLoggingMessage(req, resp, hostName, applicationConfig, sendToLog) {
    var path = url.parse(req.url, true).query.path;
    var session = req.session;
    var message = req.body;
    var persistableSemotableTemplate = Persistor(null, null, Semotus);

    if (!session.semotus) {
        session.semotus = {controllers: {}, loggingContext: {}};
    }

    if (!session.semotus.loggingContext[path]) {
        session.semotus.loggingContext[path] = getLoggingContext(path, null, hostName);
    }

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
