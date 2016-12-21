var Utils = require('./utils');
var logMessage = Utils.logMessage;
var establishApplication = require('./establishApplication').establishApplication;
var establishDaemon = require('./establishDaemon').establishDaemon;
var Persistor = require('persistor');
var SuperType = require('supertype');
var PersistObjectTemplate = Persistor(null, null, SuperType);

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
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} db unknown
 */
function handleDBCase(dbConfig, config, appName, path, cpath, schema, sessionStore, amorphicOptions, applicationConfig,
                      nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps, db) {
    logMessage('DB connection established to ' + dbConfig.dbName);

    // TODO: Try to pull this function out
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

    if (config.isDaemon) {
        establishApplication(appName, path + '/js/', cpath + '/js/', injectObjectTemplate,
            amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver,
            config, config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
            amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap,
            applicationPersistorProps);
    }
    else {
        establishApplication(appName, path + '/public/js/', cpath + '/js/', injectObjectTemplate,
            amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver,
            config, config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
            amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap,
            applicationPersistorProps);
    }

    if (config.isDaemon) {
        establishDaemon(appName, applicationConfig, amorphicOptions, applicationSource, applicationSourceMap,
            applicationPersistorProps);

        logMessage(appName + ' started as a daemon');
    }
}

module.exports = {
    handleDBCase: handleDBCase
};
