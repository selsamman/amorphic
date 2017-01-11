'use strict';
let AmorphicContext = require('../AmorphicContext');
let os = require('os');

//TODO: Switch these over to be logs.
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

    if (AmorphicContext.sendToLog) {
        logger.sendToLog = AmorphicContext.sendToLog;
    }
}

module.exports = {
    logMessage: logMessage,
    getLoggingContext: getLoggingContext,
    setupLogger: setupLogger
};
