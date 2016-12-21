'use strict';

var logMessage = require('./utils').logMessage;
var readFile = require('./readFile').readFile;
var establishApplication = require('./establishApplication').establishApplication;
var establishDaemon = require('./establishDaemon').establishDaemon;
var q = require('q');
var nonObjTemplatelogLevel = 1;

/**
 * Purpose unknown
 *
 * @param {unknown} appName unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} appList unknown
 * @param {unknown} configStore unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 *
 * @returns {unknown} unknown
 */
function startApplication(appName, appDirectory, appList, configStore, sessionStore, amorphicOptions, applicationConfig,
                          applicationSource, applicationSourceMap, applicationPersistorProps) {

    var path = appDirectory + '/' + appList[appName] + '/';
    var cpath = appDirectory + '/apps/common/';
    var config = configStore[appName].get();

    var commonJsDir = cpath + '/js/';
    var controllerJsDir = path + (config.isDaemon ? '/js/' : '/public/js/');
    var schema = JSON.parse((readFile(path + '/schema.json') || readFile(cpath + '/schema.json')).toString());

    // TODO: Completely change how we do configurations
    config.nconf = configStore[appName]; // global config
    config.configStore = configStore;

    return setUpInjectObjectTemplate(appName, amorphicOptions, config, schema)
        .then(function finishStartup(boundInjectObjectTemplateFunc) {
            establishApplication(appName, controllerJsDir, commonJsDir, boundInjectObjectTemplateFunc,
                amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null,
                config.ver, config, config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
                amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap,
                applicationPersistorProps);

            if (config.isDaemon) {
                establishDaemon(appName, applicationConfig, amorphicOptions, applicationSource, applicationSourceMap,
                    applicationPersistorProps);
                logMessage(appName + ' started as a daemon');
            }
        });
}

function setUpInjectObjectTemplate(appName, amorphicOptions, config, schema) {
    var dbConfig = buildDbConfig(appName, config);
    var connectToDbIfNeedBe = q(false); // Default to no need.

    if (dbConfig.dbName && dbConfig.dbPath) {
        if (dbConfig.dbDriver === 'mongo') {
            var MongoClient = require('mongodb-bluebird');
            connectToDbIfNeedBe = MongoClient.connect(dbConfig.dbPath + dbConfig.dbName);
        }
        else if (dbConfig.dbDriver === 'knex') {
            var knex = require('knex')({
                client: dbConfig.dbType,
                connection: {
                    host     : dbConfig.dbPath,
                    database : dbConfig.dbName,
                    user: dbConfig.dbUser,
                    password: dbConfig.dbPassword
                }, pool: {min: 0, max: dbConfig.dbConnections}
            });
            connectToDbIfNeedBe = q(knex); // require('knex') is a synchronous call that already connects
        }
    }

    return connectToDbIfNeedBe
        .then(function returnBoundInjectTemplate(db) {
            // Return the bound version so we always keep the config and dbConfig.
            return injectObjectTemplate.bind(null, amorphicOptions, config, dbConfig, db, schema);
        });
}

function injectObjectTemplate(amorphicOptions, config, dbConfig, db, schema, objectTemplate) {
    if (dbConfig && db) {
        objectTemplate.setDB(db, dbConfig.dbDriver);
        objectTemplate.setSchema(schema);
    }

    objectTemplate.config = config;
    objectTemplate.logLevel = config.nconf.get('logLevel') || 1;
    objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
}

function buildDbConfig(appName, config) {
    return {
        dbName : config.nconf.get(appName + '_dbName') || config.nconf.get('dbName') || config.nconf.get('dbname'),

        dbPath : config.nconf.get(appName + '_dbPath') || config.nconf.get('dbPath') || config.nconf.get('dbpath'),

        dbDriver : config.nconf.get(appName + '_dbDriver') || config.nconf.get('dbDriver') ||
        config.nconf.get('dbdriver') || 'mongo',

        dbType : config.nconf.get(appName + '_dbType') || config.nconf.get('dbType') ||
        config.nconf.get('dbtype') || 'mongo',

        dbUser : config.nconf.get(appName + '_dbUser') || config.nconf.get('dbUser') ||
        config.nconf.get('dbuser') || 'nodejs',

        dbPassword : config.nconf.get(appName + '_dbPassword') || config.nconf.get('dbPassword') ||
        config.nconf.get('dbpassword') || null,

        dbConnections : config.nconf.get(appName + '_dbConnections') || config.nconf.get('dbconnections') || 20,

        dbConcurrency : config.nconf.get(appName + '_dbConcurrency') || config.nconf.get('dbconcurrency') || 5
    };
}

module.exports = {
    startApplication: startApplication
};
