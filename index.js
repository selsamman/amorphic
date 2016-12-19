/* Copyright 2012-2013 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Node Modules
var connect = require('connect');
var formidable = require('formidable');
var fs = require('fs');
var os = require('os');
var path = require('path');
var Persistor = require('persistor');
var Q = require('q');
var Semotus = require('semotus');
var SuperType = require('supertype');
var url = require('url');

// Local Modules
var configBuilder = require('./configBuilder').ConfigBuilder;
var configApi = require('./configBuilder').ConfigAPI;

Semotus.maxCallTime = 60 * 1000; // Max time for call interlock

// Module Global Variables
var amorphicOptions;
var appContext = {};
var applicationConfig = {};
var applicationPersistorProps = {};
var applicationSource = {};
var applicationSourceMap = {};
var controllers = {};
var downloads;
var hostName = os.hostname();
var nonObjTemplatelogLevel = 1;
var PersistObjectTemplate = Persistor(null, null, SuperType);
var sendToLog = null;
var sessions = {};

// TODO: Remove this - this is just to set the default config options
/**
 * Purpose unknown
 *
 * @returns {unknown} unknown
 */
function reset() {
    if (appContext.connection) {
        appContext.connection.close();
    }

    appContext.connection = undefined;
    applicationConfig = {};
    applicationSource = {};
    applicationSourceMap = {};
    applicationPersistorProps = {};

    amorphicOptions = {
        conflictMode: 'soft',       // Whether to abort changes based on "old value" matching.  Values: 'soft', 'hard'
        compressSession: false,     // Whether to compress data going to REDIS
        compressXHR: true,          // Whether to compress XHR responses
        sourceMode: 'debug'         // Whether to minify templates.  Values: 'debug', 'prod' (minify)
    };

    return Q(true);
}

reset();

var establishApplication = require('./lib/establishApplication').establishApplication;
var establishDaemon = require('./lib/establishDaemon').establishDaemon;
var establishServerSession = require('./lib/establishServerSession').establishServerSession;
var Utils = require('./lib/utils');
var logMessage = Utils.logMessage;
var getTemplates = require('./lib/getTemplates').getTemplates;
var getModelSource = require('./lib/getModelSource').getModelSource;
var getModelSourceMap = require('./lib/getModelSourceMap').getModelSourceMap;
var router = require('./lib/router').router;
var uploadRouter = require('./lib/uploadRouter').uploadRouter;
var postRouter = require('./lib/postRouter').postRouter;
var downloadRouter = require('./lib/downloadRouter').downloadRouter;
var displayPerformance = require('./lib/displayPerformance').displayPerformance;
var readFile = require('./lib/readFile').readFile;
var intializePerformance = require('./lib/intializePerformance').intializePerformance;
var handleDBCase = require('./lib/handleDBCase').handleDBCase;

function localGetTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo) {
    return getTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo,
  amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
}

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 */
function amorphicEntry(req, resp, next) {
    // If we're not initalizing
    if (!req.url.match(/amorphic\/init/)) {
        next();
    }

    logMessage('Requesting ' + req.originalUrl);

    req.amorphicTracking.loggingContext.session = req.session.id;

    req.amorphicTracking.loggingContext.ipaddress =
        (String(req.headers['x-forwarded-for'] || req.connection.remoteAddress))
            .split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

    var time = process.hrtime();
    var appName;

    if (req.originalUrl.match(/([A-Za-z0-9_]*)\.cached.js.map/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');
        resp.end(getModelSourceMap(appName, applicationSourceMap));

        req.amorphicTracking.addServerTask({name: 'Request Source Map'}, time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_]*)\.cached.js/)) {
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        resp.setHeader('Content-Type', 'application/javascript');
        resp.setHeader('Cache-Control', 'public, max-age=31556926');

        if (amorphicOptions.sourceMode == 'prod') {
            if (req.originalUrl.match(/(\?ver=[0-9]+)/)) {
                resp.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=' + RegExp.$1);
            }
            else {
                resp.setHeader('X-SourceMap', '/amorphic/init/' + appName + '.cached.js.map?ver=');
            }
        }

        resp.end(getModelSource(appName, applicationSource));

        req.amorphicTracking.addServerTask('Request Compressed Sources', time);
        displayPerformance(req);
    }
    else if (req.originalUrl.match(/([A-Za-z0-9_-]*)\.js/)) {
        var url = req.originalUrl;
        appName = RegExp.$1;

        req.amorphicTracking.loggingContext.app = appName;
        logMessage('Establishing ' + appName);

        establishServerSession(req, appName, 'initial', false, null, applicationConfig, sessions, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers, nonObjTemplatelogLevel, sendToLog)
            .then (function a(session) {
                var time = process.hrtime();

                if (req.method == 'POST' && session.objectTemplate.controller.processPost) {
                    Q(session.objectTemplate.controller.processPost(req.originalUrl, req.body, req)).then(function b(controllerResp) {
                        session.save(appName, req.session, req);
                        resp.writeHead(controllerResp.status, controllerResp.headers || {'Content-Type': 'text/plain'});
                        resp.end(controllerResp.body || '');
                    });

                    req.amorphicTracking.addServerTask({name: 'Application Post'}, time);
                    displayPerformance(req);
                }
                else {
                    resp.setHeader('Content-Type', 'application/javascript');
                    resp.setHeader('Cache-Control', 'public, max-age=0');

                    if (amorphicOptions.sourceMode != 'debug') {
                        resp.end(
                            "document.write(\"<script src='" + url.replace(/\.js/, '.cached.js') + "'></script>\");\n" +
                            "amorphic.setApplication('" + appName + "');" +
                            'amorphic.setSchema(' + JSON.stringify(session.getPersistorProps()) + ');' +
                            'amorphic.setConfig(' + JSON.stringify(JSON.parse(session.getServerConfigString())) + ');' +
                            'amorphic.setInitialMessage(' + session.getServerConnectString() + ');'
                        );
                    }
                    else {
                        resp.end(
                            getModelSource(appName, applicationSource) +
                            "amorphic.setApplication('" + appName + "');" +
                            'amorphic.setSchema(' + JSON.stringify(session.getPersistorProps()) + ');' +
                            'amorphic.setConfig(' + JSON.stringify(JSON.parse(session.getServerConfigString())) + ');' +
                            'amorphic.setInitialMessage(' + session.getServerConnectString() + ');'
                        );
                    }

                    req.amorphicTracking.addServerTask({name: 'Application Initialization'}, time);
                    displayPerformance(req);
                }
            }).done();
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} configStore unknown
 */
function fetchStartUpParams(configStore) {
    var rootCfg = configStore['root'];

    amorphicOptions.compressXHR = rootCfg.get('compressXHR') || amorphicOptions.compressXHR;
    amorphicOptions.sourceMode = rootCfg.get('sourceMode') || amorphicOptions.sourceMode;
    amorphicOptions.compressSession = rootCfg.get('compressSession') || amorphicOptions.compressSession;
    amorphicOptions.conflictMode = rootCfg.get('conflictMode') || amorphicOptions.conflictMode;
    amorphicOptions.sessionExpiration = rootCfg.get('sessionSeconds') * 1000;
    amorphicOptions.objectCacheExpiration = rootCfg.get('objectCacheSeconds') * 1000;
    amorphicOptions.sessionSecret = rootCfg.get('sessionSecret');

    amorphicOptions.appList = rootCfg.get('applications');
    amorphicOptions.appStartList = rootCfg.get('application').split(';');
    amorphicOptions.mainApp = amorphicOptions.appStartList[0];

    amorphicOptions.port = rootCfg.get('port');
}

/**
 * Purpose unknown
 */
function generateDownloadsDir() {
    // Create temporary directory for file uploads
    var dloads = path.join(path.dirname(require.main.filename), 'download');

    if (!fs.existsSync(dloads)) {
        fs.mkdirSync(dloads);
    }

    var files = fs.readdirSync(dloads);

    for (var ix = 0; ix < files.length; ++ix) {
        fs.unlinkSync(path.join(dloads, files[ix]));
    }

    downloads = dloads;
}

/**
 * Purpose unknown
 *
 * @param {unknown} appName unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} appList unknown
 * @param {unknown} configStore unknown
 * @param {unknown} sessionStore unknown
 *
 * @returns {unknown} unknown
 */
function startApplication(appName, appDirectory, appList, configStore, sessionStore) {

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

/**
 * Purpose unknown
 *
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} appList unknown
 * @param {unknown} appStartList unknown
 * @param {unknown} appDirectory unknown
 * @param {unknown} mainApp unknown
 * @param {unknown} sessionRouter unknown
 */
function startUpServer(preSessionInject, postSessionInject, appList, appStartList, appDirectory, mainApp, sessionRouter) {
    var app = connect();

    if (amorphicOptions.compressXHR) {
        app.use(require('compression')());
    }

    if (preSessionInject) {
        preSessionInject.call(null, app);
    }

    for (var appName in appList) {
        if (appStartList.indexOf(appName) >= 0) {
            var path = appDirectory + '/' + appList[appName] + '/public';

            app.use('/' + appName + '/', connect.static(path, {index: 'index.html'}));

            if (appName == mainApp) {
                app.use('/', connect.static(path, {index: 'index.html'}));
            }

            logMessage(appName + ' connected to ' + path);
        }
    }

    var rootSuperType;

    if (fs.existsSync(appDirectory + '/node_modules/supertype')) {
        rootSuperType = appDirectory;
    }
    else {
        rootSuperType = __dirname;
    }

    var rootSemotus;

    if (fs.existsSync(appDirectory + '/node_modules/semotus')) {
        rootSemotus = appDirectory;
    }
    else {
        rootSemotus = __dirname;
    }

    var rootBindster;

    if (fs.existsSync(appDirectory + '/node_modules/amorphic-bindster')) {
        rootBindster = appDirectory;
    }
    else {
        rootBindster = __dirname;
    }

    app.use(intializePerformance)
        .use('/modules/', connect.static(appDirectory + '/node_modules'))
        .use('/bindster/', connect.static(rootBindster + '/node_modules/amorphic-bindster'))
        .use('/amorphic/', connect.static(appDirectory))
        .use('/common/', connect.static(appDirectory + '/apps/common'))
        .use('/supertype/', connect.static(rootSuperType + '/node_modules/supertype'))
        .use('/semotus/', connect.static(rootSemotus + '/node_modules/semotus'))
        .use(connect.cookieParser())
        .use(sessionRouter)
        .use(uploadRouter.bind(this, downloads))
        .use(downloadRouter.bind(this, applicationConfig, sessions, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers, nonObjTemplatelogLevel, sendToLog))
        .use(connect.bodyParser())
        .use(postRouter.bind(this, applicationConfig, sessions, amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers, nonObjTemplatelogLevel, sendToLog))
        .use(amorphicEntry);

    if (postSessionInject) {
        postSessionInject.call(null, app);
    }

    app.use(router.bind(this, hostName, applicationConfig, sendToLog, sessions, amorphicOptions, nonObjTemplatelogLevel,
                        applicationSource, applicationSourceMap, applicationPersistorProps, controllers));
    appContext.connection = app.listen(amorphicOptions.port);
}

/**
 * Purpose unknown
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} sendToLogFunction unknown
 */
function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction) {
    sendToLog = sendToLogFunction;

    var builder = new configBuilder(new configApi());
    var configStore = builder.build(appDirectory);

    fetchStartUpParams(configStore);
    generateDownloadsDir();

    logMessage('Starting Amorphic with options: ' + JSON.stringify(amorphicOptions));

    sessionStore = sessionStore || new (connect.session.MemoryStore)();

    var sessionRouter = connect.session(
        {
            store: sessionStore, secret: amorphicOptions.sessionSecret,
            cookie: {maxAge: amorphicOptions.sessionExpiration},
            rolling: true
        } // TODO: What is rolling: true?
    );

    // Initialize applications
    var appList = amorphicOptions.appList;
    var appStartList = amorphicOptions.appStartList;
    var mainApp = amorphicOptions.mainApp;
    var promises = [];

    for (var appKey in appList) {
        if (appStartList.indexOf(appKey) >= 0) {
            promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore));
        }
    }

    Q.all(promises).then(startUpServer.bind(this, preSessionInject, postSessionInject, appList, appStartList, appDirectory, mainApp, sessionRouter))
        .catch(function f(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    getTemplates: localGetTemplates,
    listen: listen,
    reset: reset
};
