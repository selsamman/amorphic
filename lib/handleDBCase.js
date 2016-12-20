var Utils = require('./utils');
var logMessage = Utils.logMessage;
var establishApplication = require('./establishApplication').establishApplication;
var establishDaemon = require('./establishDaemon').establishDaemon;

/**
 * Purpose unknown
 *
 * @param {unknown} dbConfig unknown
 * @param {unknown} config unknown
 * @param {unknown} appName unknown
 * @param {unknown} path unknown
 * @param {unknown} cpath unknown
 * @param {unknown} schema unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} PersistObjectTemplate unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} db unknown
 */
function handleDBCase(dbConfig, config, appName, path, cpath, schema, sessionStore, PersistObjectTemplate, amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps, db) {
    logMessage('DB connection established to ' + dbConfig.dbName);
    var commonJsDir = cpath + '/js/';
    var controllerJsDir = path + (config.isDaemon ? '/js/' : '/public/js/');

    // TODO: Try to pull this function out
    // Only needed since establish app may load the templates.
    function injectObjectTemplate(objectTemplate) {

        if (dbConfig.dbDriver == 'knex') {
            objectTemplate.setDB(db, PersistObjectTemplate.DB_Knex);
        }
        else {
            objectTemplate.setDB(db);
        }

        objectTemplate.setSchema(schema);
        objectTemplate.config = config;
        objectTemplate.logLevel = config.nconf.get('logLevel') || 1;

        objectTemplate.concurrency = dbConfig.dbConcurrency; //TODO: What does dbConcurrency do?
        objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
    }

    establishApplication(appName, controllerJsDir, commonJsDir, injectObjectTemplate,
        amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
        config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
        amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);

    if (config.isDaemon) {
        establishDaemon(appName, applicationConfig, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
        logMessage(appName + ' started as a daemon');
    }
}

module.exports = {
    handleDBCase: handleDBCase
};
