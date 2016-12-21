"use strict";

// Logging for rare situations where we don't have an objectTemplate
/**
 * Purpose unknown
 *
 * @param {unknown} level unknown
 * @param {unknown} sessionId unknown
 * @param {unknown} data unknown
 * @param {unknown} logLevel unknown
 */
function log(level, sessionId, data,
  logLevel) {
    if (level > logLevel) {
        return;
    }

    var t = new Date();

    var time = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate() + ' ' +
        t.toTimeString().replace(/ .*/, '') + ':' + t.getMilliseconds();

    var message = (time + '(' + sessionId + ') ' + 'Semotus:' + data);

    logMessage(message);
}

/**
 * Writing a function to consolidate our logMessage statements so they can be easily replaced later
 *
 * @param {String} message A message to be printed to the console.
 */
function logMessage(message) {
    console.log(message);
}

/**
 * Purpose unknown
 *
 * @param {unknown} app unknown
 * @param {unknown} context unknown
 * @param {unknown} hostName unknown
 *
 * @returns {unknown} unknown
 */
function getLoggingContext(app, context, hostName) {
    context = context || {};
    context.environment = process.env.NODE_ENV || 'local';
    context.name = app;
    context.hostname = hostName;
    context.pid = process.pid;

    return context;
}

/**
 * Purpose unknown
 *
 * @param {unknown} logger unknown
 * @param {unknown} path unknown
 * @param {unknown} context unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} sendToLog unknown
 */
function setupLogger(logger, path, context, applicationConfig, sendToLog) {
    logger.startContext(context);
    logger.setLevel(applicationConfig[path].logLevel);

    if (sendToLog) {
        logger.sendToLog = sendToLog;
    }
}

module.exports = {
    log: log,
    logMessage: logMessage,
    getLoggingContext: getLoggingContext,
    setupLogger: setupLogger
};
