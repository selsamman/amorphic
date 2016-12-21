var processLoggingMessage = require('./processLoggingMessage').processLoggingMessage;
var processMessage = require('./processMessage').processMessage;

/**
 * Purpose unknown
 *
 * @param {unknown} hostName unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} sendToLog unknown
 * @param {unknown} sessions unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function router(hostName, applicationConfig, sendToLog, sessions, amorphicOptions, nonObjTemplatelogLevel,
                applicationSource, applicationSourceMap, applicationPersistorProps, controllers, req, resp, next) {

    if (req.url.match(/amorphic\/xhr\?path\=/)) {
        if (req.body.type == 'logging') {
            processLoggingMessage(req, resp, hostName, applicationConfig, sendToLog);
        }
        else {
            processMessage(req, resp, sessions, amorphicOptions, nonObjTemplatelogLevel, applicationConfig,
                applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers, sendToLog);
        }
    }
    else {
        next();
    }
}

module.exports = {
    router: router
};
