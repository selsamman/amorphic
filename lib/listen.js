var configBuilder = require('../configBuilder').ConfigBuilder;
var configApi = require('../configBuilder').ConfigAPI;
var fetchStartUpParams = require('./fetchStartUpParams').fetchStartUpParams;
var generateDownloadsDir = require('./generateDownloadsDir').generateDownloadsDir;
var logMessage = require('./utils').logMessage;
var startApplication = require('./startApplication').startApplication;
var startUpServer = require('./startUpServer').startUpServer;
var path = require('path');
var connect = require('connect');
var Q = require('q');

/**
 * Purpose unknown
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} sendToLogFunction unknown
 * @param {unknown} sendToLog unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} downloads unknown
 * @param {unknown} PersistObjectTemplate unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} nonObjTemplatelogLevel unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} sessions unknown
 * @param {unknown} hostName unknown
 * @param {unknown} controllers unknown
 * @param {unknown} appContext unknown
 */
function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction, sendToLog, amorphicOptions, downloads,
                PersistObjectTemplate, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps,
                sessions, hostName, controllers, appContext) {
    sendToLog = sendToLogFunction;

    var builder = new configBuilder(new configApi());
    var configStore = builder.build(appDirectory);

    fetchStartUpParams(configStore, amorphicOptions);
    downloads = generateDownloadsDir(path);

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
            promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore, PersistObjectTemplate, amorphicOptions, applicationConfig, nonObjTemplatelogLevel, applicationSource, applicationSourceMap, applicationPersistorProps));
        }
    }

    Q.all(promises).then(startUpServer.bind(this, preSessionInject, postSessionInject, appList, appStartList, appDirectory, mainApp, sessionRouter, amorphicOptions, downloads, applicationConfig, sessions, applicationSource, applicationSourceMap, applicationPersistorProps, hostName, controllers, nonObjTemplatelogLevel, sendToLog, appContext))
        .catch(function f(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    listen: listen
};
