'use strict';
let AmorphicContext = require('../AmorphicContext');
let os = require('os');

//TODO: Switch these over to be logs.

// TODO: Switch everything over to be bunyan.
// Logging for rare situations where we don't have an objectTemplate
/**
 * Purpose unknown
 * NOTE: ONLY USED IN AMORPHIC!
 * @param {unknown} level unknown
 * @param {unknown} sessionId unknown
 * @param {unknown} data unknown
 * @param {unknown} logLevel unknown
 */
function log(level, sessionId, data, logLevel) {
    if (level > logLevel) {
        return;
    }

    let t = new Date();

    // TODO: Why aren't we using moment for this?
    let time = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate() + ' ' +
    t.toTimeString().replace(/ .*/, '') + ':' + t.getMilliseconds();

    let message = (time + '(' + sessionId + ') ' + 'Semotus:' + data);

    logMessage(message);
}


/**
 * Writing a function to consolidate our logMessage statements so they can be easily replaced later
 * NOTE: Default function for sendToLog that is passed to us as the log function to use.
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
 *
 * @returns {unknown} unknown
 */
function getLoggingContext(app, context) {
    context = context || {};
    context.environment = process.env.NODE_ENV || 'local';
    context.name = app;
    context.hostname = os.hostname();
    context.pid = process.pid;

    return context;
}

/**
 * To setup the logger based on a sendToLog function that is passed in from the application
 * to the listen function.
 *
 * @param {unknown} logger unknown
 * @param {unknown} path unknown
 * @param {unknown} context unknown
 * @param {unknown} applicationConfig unknown
 */
function setupLogger(logger, path, context, applicationConfig) {
    logger.startContext(context);
    logger.setLevel(applicationConfig[path].logLevel);

    if (AmorphicContext.appContext.sendToLog) {
        logger.sendToLog = AmorphicContext.appContext.sendToLog;
    }
}

module.exports = {
    log: log,
    logMessage: logMessage,
    getLoggingContext: getLoggingContext,
    setupLogger: setupLogger
};
