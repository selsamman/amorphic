'use strict';

// Our stuff
var AmorphicContext = require('./AmorphicContext');
var logMessage = require('./utils/logger').logMessage;
var readFile = require('./utils/readFile').readFile;
var getTemplates = require('./getTemplates').getTemplates;

// Libs
var Bluebird = require('bluebird');
var persistor = require('persistor');
var semotus = require('semotus');
var superType = require('supertype');

/**
 * Purpose unknown
 *
 * @param {String} appName unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} appList unknown
 * @param {unknown} configStore unknown
 * @param {unknown} sessionStore unknown
 *
 * @returns {unknown} unknown
 */
function startApplication(appName, appDirectory, appList, configStore, sessionStore) {

    var path = appDirectory + '/' + appList[appName] + '/';
    var commonPath = appDirectory + '/apps/common/';
    var config = configStore[appName].get();

    var commonJsDir = commonPath + '/js/';
    var controllerJsDir = path + (config.isDaemon ? '/js/' : '/public/js/');
    var schema = JSON.parse((readFile(path + '/schema.json') || readFile(commonPath + '/schema.json')).toString());

    var controllerPath = (config.controller || 'controller.js');
    var matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    var prefix = matches[1];
    var prop = matches[2];

    // TODO: Completely change how we do configurations
    config.nconf = configStore[appName]; // global config
    config.configStore = configStore;

    return setUpInjectObjectTemplate(appName, config, schema)
        .then(function buildAppConfigAndLoadTemplates(boundInjectObjectTemplateFunc) {
            loadAppConfigToContext(appName, config, controllerJsDir, commonJsDir,
                                    boundInjectObjectTemplateFunc, sessionStore);
            return loadTemplates(appName);
        })
        .spread(function finishDaemonIfNeeded(baseTemplate, appTemplates) {
            if (config.isDaemon) {
                if (!appTemplates[prop].Controller) {
                    throw new Error('Missing controller template in ' + prefix + prop + '.js');
                }
                startDaemon(baseTemplate, appTemplates[prop].Controller);
                logMessage(appName + ' started as a daemon');
            }
        });
}

/**
 * Sets up the injectObjectTemplate function used when loading templates to make them PersistableSemotable or
 * simply Persistable.
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 * @param {String} schema - The app schema.
 * @returns {Function} A bound function to be used when loading templates.
 */
function setUpInjectObjectTemplate(appName, config, schema) {
    var amorphicOptions = AmorphicContext.amorphicOptions || {};
    var dbConfig = buildDbConfig(appName, config);
    var connectToDbIfNeedBe = Bluebird.resolve(false); // Default to no need.

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
            connectToDbIfNeedBe = Bluebird.resolve(knex); // require('knex') is a synchronous call that already connects
        }
    }

    return connectToDbIfNeedBe
        .then(function returnBoundInjectTemplate(db) {
            // Return the bound version so we always keep the config and dbConfig.
            return injectObjectTemplate.bind(null, amorphicOptions, config, dbConfig, db, schema);
        });
}

/**
 * Used to add inject props during get/load templates.
 * @param {Object} amorphicOptions - unknown
 * @param {Object} config - The app specific config from the config store.
 * @param {Object} dbConfig - The db config.
 * @param {Object} db - The db connection.
 * @param {String} schema - The app schema.
 * @param {Object} objectTemplate - Object template passed in later.
 */
function injectObjectTemplate(amorphicOptions, config, dbConfig, db, schema, objectTemplate) {
    if (dbConfig && db) {
        objectTemplate.setDB(db, dbConfig.dbDriver);
        objectTemplate.setSchema(schema);
    }

    objectTemplate.config = config;
    objectTemplate.logLevel = config.nconf.get('logLevel') || 1;
    objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
}

/**
 * Builds a data base config, pulling options from the app config.
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 * @returns {Object} an object containing all the dbconfig options.
 */
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

/**
 * Loads templates for an app.
 * @param {String} appName - The app name.
 * @returns {[Object, Object]}
 */
function loadTemplates(appName) {

    var appConfig = AmorphicContext.applicationConfig[appName] || {};
    var applicationSource = AmorphicContext.applicationSource;
    var applicationSourceMap = AmorphicContext.applicationSourceMap;
    var controllerPath = (appConfig.appConfig.controller || 'controller.js');
    var matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    var prop = matches[2];
    var baseTemplate = buildBaseTemplate(appConfig);

    applicationSource[appName] = '';
    applicationSourceMap[appName] = '';

    // Inject into it any db or persist attributes needed for application
    if (appConfig.initObjectTemplate && typeof appConfig.initObjectTemplate === 'function') {
        appConfig.initObjectTemplate(baseTemplate);
    }

    return [
        baseTemplate,
        getTemplates(baseTemplate, appConfig.appPath, [prop + '.js'], appConfig, appName)
    ];
}

/**
 * Build the base template based on the app config.
 * @param {Object} appConfig - The application config.
 * @returns {Object} The base template object.
 */
function buildBaseTemplate(appConfig) {
    if (appConfig.appConfig && appConfig.appConfig.isDaemon) {
        return persistor(null, null, superType);
    }
    return persistor(null, null, semotus);
}

/**
 * Loads the the applicationConfig for a given app.
 *
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 * @param {String} path - The path for app files.
 * @param {String} commonPath - The path for common files.
 * @param {Function} initObjectTemplateFunc - The function to inject props on all templates.
 * @param {Object} sessionStore - unknown
 */
function loadAppConfigToContext(appName, config, path, commonPath, initObjectTemplateFunc, sessionStore) {
    var amorphicOptions = AmorphicContext.amorphicOptions;

    AmorphicContext.applicationConfig[appName] = {
        appPath: path,
        commonPath: commonPath,
        initObjectTemplate: initObjectTemplateFunc,
        sessionExpiration: amorphicOptions.sessionExpiration,
        objectCacheExpiration: amorphicOptions.objectCacheExpiration,
        sessionStore: sessionStore,
        appVersion: config.ver,
        appConfig: config,
        logLevel: config.nconf.get(appName + '_logLevel') || config.nconf.get('logLevel') || 'info'
    };
}

/**
 * Start an app in daemon mode. Instantiating the main controller.
 * @param {Object} persistableTemplate - The base persistor template for the app. (the objectTemplate injected
 * into all the files)
 * @param {Object} MainControllerTemplate - The main controller for the app.
 */
function startDaemon(persistableTemplate, MainControllerTemplate) {
    var controller;

    MainControllerTemplate.objectTemplate = persistableTemplate;
    controller = new MainControllerTemplate();

    // Since this is the 'objectTemplate' passed into every file, make sure it has its controller set.
    persistableTemplate.controller = controller;
    controller.serverInit();
}

module.exports = {
    startApplication: startApplication
};
