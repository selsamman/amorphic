'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let logMessage = require('./utils/logger').logMessage;
let readFile = require('./utils/readFile').readFile;
let getTemplates = require('./getTemplates').getTemplates;

// Npm modules
let Bluebird = require('bluebird');
let persistor = require('persistor');
let semotus = require('semotus');
let superType = require('supertype');

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

    let path = appDirectory + '/' + appList[appName] + '/';
    let commonPath = appDirectory + '/apps/common/';
    let config = configStore[appName].get();
    let commonJsDir = commonPath + '/js/';
    let controllerJsDir = path + '/public/js/';

    if (config.isDaemon) {
        controllerJsDir = path + '/js/';
    }

    let schema = JSON.parse((readFile(path + '/schema.json') || readFile(commonPath + '/schema.json')).toString());

    let controllerPath = (config.controller || 'controller.js');
    let matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    let prefix = matches[1];
    let prop = matches[2];

    // TODO: Completely change how we do configurations
    config.nconf = configStore[appName]; // Global config
    config.configStore = configStore;

    return setUpInjectObjectTemplate(appName, config, schema)
        .then(buildAppConfigAndLoadTemplates.bind(this, appName, config, controllerJsDir, commonJsDir, sessionStore))
        .spread(finishDaemonIfNeeded.bind(this, config, prop, prefix, appName));
}

/**
 * Sets up the injectObjectTemplate function used when loading templates to make them PersistableSemotable or
 *   simply Persistable.
 *
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 * @param {String} schema - The app schema.
 *
 * @returns {Function} A bound function to be used when loading templates.
 */
function setUpInjectObjectTemplate(appName, config, schema) {
    let amorphicOptions = AmorphicContext.amorphicOptions || {};
    let dbConfig = buildDbConfig(appName, config);
    let connectToDbIfNeedBe = Bluebird.resolve(false); // Default to no need.

    if (dbConfig.dbName && dbConfig.dbPath) {
        if (dbConfig.dbDriver === 'mongo') {
            let MongoClient = require('mongodb-bluebird');
            connectToDbIfNeedBe = MongoClient.connect(dbConfig.dbPath + dbConfig.dbName);
        }
        else if (dbConfig.dbDriver === 'knex') {
            let knex = require('knex')({
                client: dbConfig.dbType,
                connection: {
                    host:       dbConfig.dbPath,
                    database:   dbConfig.dbName,
                    user:       dbConfig.dbUser,
                    password:   dbConfig.dbPassword
                },
                pool: {
                    min: 0,
                    max: dbConfig.dbConnections
                }
            });

            connectToDbIfNeedBe = Bluebird.resolve(knex); // require('knex') is a synchronous call that already connects
        }
    }

    return connectToDbIfNeedBe
        .then(returnBoundInjectTemplate.bind(this, amorphicOptions, config, dbConfig, schema));
}

/**
 * Builds a data base config, pulling options from the app config.
 *
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 *
 * @returns {Object} An object containing all the dbconfig options.
 */
function buildDbConfig(appName, config) {
    return {
        dbName:         fetchFromConfig(appName, config, 'dbName'),
        dbPath:         fetchFromConfig(appName, config, 'dbPath'),
        dbDriver:       fetchFromConfig(appName, config, 'dbDriver')      || 'mongo',
        dbType:         fetchFromConfig(appName, config, 'dbType')        || 'mongo',
        dbUser:         fetchFromConfig(appName, config, 'dbUser')        || 'nodejs',
        dbPassword:     fetchFromConfig(appName, config, 'dbPassword')    || null,
        dbConnections:  fetchFromConfig(appName, config, 'dbConnections') || 20,
        dbConcurrency:  fetchFromConfig(appName, config, 'dbConcurrency') || 5
    };
}

/**
 * Attempts to fetch a value out of the config file by first looking for the property's name in
 *   camelCase proceeded by an underscore, then looking for the name in camelCase, then in lowercase.
 *
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 * @param {String} toFetch - The property you want to fetch from the config.
 *
 * @returns {String|Boolean} The configuration property you requested if found, otherwise false.
 */
function fetchFromConfig(appName, config, toFetch) {
    let lowerCase = toFetch.toLowerCase();

    return config.nconf.get(appName + '_' + toFetch) || config.nconf.get(toFetch) || config.nconf.get(lowerCase);
}

/**
 * Returns a bound version of injectObjectTemplate.  Needed because...
 *
 * @param {Object} amorphicOptions - unknown
 * @param {Object} config - The app specific config from the config store.
 * @param {Object} dbConfig - An object containing all the dbconfig options.
 * @param {String} schema - The app schema.
 * @param {Object} db - A connection to the database.
 *
 * @returns {Function} A bound version of injectObjectTemplate.
 */
function returnBoundInjectTemplate(amorphicOptions, config, dbConfig, schema, db) {
    // Return the bound version so we always keep the config and dbConfig.
    return injectObjectTemplate.bind(null, amorphicOptions, config, dbConfig, db, schema);
}

/**
 * Used to add inject props during get/load templates.
 *
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
 * Used to add inject props during get/load templates.
 *
 * @param {String} appName - The app name.
 * @param {Object} config - The app specific config from the config store.
 * @param {String} controllerJsDir - The path for app files.
 * @param {String} commonJsDir - The path for common files.
 * @param {Object} sessionStore - unknown
 * @param {Function} boundInjectObjectTemplateFunc - A bound version of injectObjectTemplate.
 *
 * @returns {[Object, Object]}
 */
function buildAppConfigAndLoadTemplates(appName, config, controllerJsDir, commonJsDir, sessionStore,
                                        boundInjectObjectTemplateFunc) {
    loadAppConfigToContext(appName, config, controllerJsDir, commonJsDir, boundInjectObjectTemplateFunc, sessionStore);

    return loadTemplates(appName);
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
    let amorphicOptions = AmorphicContext.amorphicOptions;

    AmorphicContext.applicationConfig[appName] = {
        appPath:                path,
        commonPath:             commonPath,
        initObjectTemplate:     initObjectTemplateFunc,
        sessionExpiration:      amorphicOptions.sessionExpiration,
        objectCacheExpiration:  amorphicOptions.objectCacheExpiration,
        sessionStore:           sessionStore,
        appVersion:             config.ver,
        appConfig:              config,
        logLevel:               fetchFromConfig(appName, config, 'logLevel') || 'info'
    };
}

/**
 * Loads templates for an app.
 *
 * @param {String} appName - The app name.
 *
 * @returns {[Object, Object]} unknown
 */
function loadTemplates(appName) {

    let appConfig = AmorphicContext.applicationConfig[appName] || {};
    let applicationSource = AmorphicContext.applicationSource;
    let applicationSourceMap = AmorphicContext.applicationSourceMap;
    let controllerPath = (appConfig.appConfig.controller || 'controller.js');
    let matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    let prop = matches[2];
    let baseTemplate = buildBaseTemplate(appConfig);

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
 *
 * @param {Object} appConfig - The application config.
 *
 * @returns {Object} The base template object.
 */
function buildBaseTemplate(appConfig) {
    if (appConfig.appConfig && appConfig.appConfig.isDaemon) {
        return persistor(null, null, superType);
    }

    return persistor(null, null, semotus);
}

/**
 * Build the base template based on the app config.
 *
 * @param {Object} config - The app specific config from the config store.
 * @param {String} prop - unknown
 * @param {String} prefix - unknown
 * @param {String} appName - The app name.
 * @param {Object} baseTemplate - unknown
 * @param {Object} appTemplates - unknown
 */
function finishDaemonIfNeeded(config, prop, prefix, appName, baseTemplate, appTemplates) {
    if (config.isDaemon) {
        if (!appTemplates[prop].Controller) {
            throw new Error('Missing controller template in ' + prefix + prop + '.js');
        }
        startDaemon(baseTemplate, appTemplates[prop].Controller);
        logMessage(appName + ' started as a daemon');
    }
}

// TODO: Are we sure this is unqiue to daemons?  What's so bad if we just do it for normal apps?
/**
 * Start an app in daemon mode. Instantiating the main controller.
 *
 * @param {Object} persistableTemplate - The base persistor template for the app. (the objectTemplate injected
 *   into all the files)
 * @param {Object} MainControllerTemplate - The main controller for the app.
 */
function startDaemon(persistableTemplate, MainControllerTemplate) {
    let controller;

    MainControllerTemplate.objectTemplate = persistableTemplate;
    controller = new MainControllerTemplate();

    // Since this is the 'objectTemplate' passed into every file, make sure it has its controller set.
    persistableTemplate.controller = controller;
    controller.serverInit();
}

module.exports = {
    startApplication: startApplication
};
