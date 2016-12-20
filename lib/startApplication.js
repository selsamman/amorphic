var logMessage = require('./utils').logMessage;
var readFile = require('./readFile').readFile;
var handleDBCase = require('./handleDBCase').handleDBCase;
var establishApplication = require('./establishApplication').establishApplication;
var establishDaemon = require('./establishDaemon').establishDaemon;
var Q = require('q');

/**
 * Purpose unknown
 *
 * @param {unknown} appName unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} appList unknown
 * @param {unknown} configStore unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} PersistObjectTemplate unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 *
 * @returns {unknown} unknown
 */
function startApplication(appName, appDirectory, appList, configStore, sessionStore, PersistObjectTemplate, amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps) {
    
    var path = appDirectory + '/' + appList[appName] + '/';
    var cpath = appDirectory + '/apps/common/';
    
    // TODO: Completely change how we do configurations
    var config = configStore[appName].get();
    config.nconf = configStore[appName]; // global config
    config.configStore = configStore;
    
    var schema = JSON.parse((readFile(path + '/schema.json') || readFile(cpath + '/schema.json')).toString());
    
    var dbConfig = {
        dbName : config.nconf.get(appName + '_dbName') || config.nconf.get('dbName') || config.nconf.get('dbname'),
        dbPath : config.nconf.get(appName + '_dbPath') || config.nconf.get('dbPath') || config.nconf.get('dbpath'),
        dbDriver : config.nconf.get(appName + '_dbDriver') || config.nconf.get('dbDriver') || config.nconf.get('dbdriver') || 'mongo',
        dbType : config.nconf.get(appName + '_dbType') || config.nconf.get('dbType') || config.nconf.get('dbtype') || 'mongo',
        dbUser : config.nconf.get(appName + '_dbUser') || config.nconf.get('dbUser') || config.nconf.get('dbuser') || 'nodejs',
        dbPassword : config.nconf.get(appName + '_dbPassword') || config.nconf.get('dbPassword') || config.nconf.get('dbpassword') || null,
        dbConnections : config.nconf.get(appName + '_dbConnections') || config.nconf.get('dbconnections') || 20,
        dbConcurrency : config.nconf.get(appName + '_dbConcurrency') || config.nconf.get('dbconcurrency') || 5
    };
    
    var dbClient;
    
    if (dbConfig.dbName && dbConfig.dbPath) {
        if (dbConfig.dbDriver == 'mongo') {
            var MongoClient = require('mongodb-bluebird');
            dbClient = MongoClient.connect(dbConfig.dbPath + dbConfig.dbName);
        }
        else if (dbConfig.dbDriver == 'knex') {
            var knex = require('knex')({
                client: dbConfig.dbType,
                connection: {
                    host     : dbConfig.dbPath,
                    database : dbConfig.dbName,
                    user: dbConfig.dbUser,
                    password: dbConfig.dbPassword
                }, pool: {min: 0, max: dbConfig.dbConnections}
            });
            
            dbClient = Q(knex); // TODO: knex is already initialized because it is a synchronous function that is called when require('knex') occurs
        }
        
        return dbClient.then(handleDBCase.bind(this, dbConfig, config, appName, path, cpath, schema, sessionStore, PersistObjectTemplate, amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps)).catch(function errorrr(e) {
            logMessage(e.message + e.stack);
        });
    }
    else {
        // No database case
        if (config.isDaemon) {
            establishApplication(appName, path + '/js/', cpath + '/js/', injectObjectTemplate,
                amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
                config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
                amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);
        }
        else {
            establishApplication(appName, path + '/public/js/', cpath + '/js/', injectObjectTemplate,
                amorphicOptions.sessionExpiration, amorphicOptions.objectCacheExpiration, sessionStore, null, config.ver, config,
                config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info',
                amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps);
        }
        
        if (config.isDaemon) {
            establishDaemon(appName, applicationConfig, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
            logMessage(appName + ' started as a daemon');
        }
    }
    
    function injectObjectTemplate(objectTemplate) {
        objectTemplate.config = config;
        objectTemplate.logLevel = config.nconf.get('logLevel') || 1;
        objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
    }
}

module.exports = {
    startApplication: startApplication
};
