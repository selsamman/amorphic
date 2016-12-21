"use strict";

var configBuilder = require('../configBuilder').ConfigBuilder;
var configApi = require('../configBuilder').ConfigAPI;
var fetchStartUpParams = require('./fetchStartUpParams').fetchStartUpParams;
var logMessage = require('./utils').logMessage;
var startApplication = require('./startApplication').startApplication;
var startUpServer = require('./startUpServer').startUpServer;
var connect = require('connect');
var Q = require('q');
var sendToLog = null;

/**
 * Purpose unknown
 *
 * @param {unknown} appDirectory unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} preSessionInject unknown
 * @param {unknown} postSessionInject unknown
 * @param {unknown} sendToLogFunction unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationConfig unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 * @param {unknown} appContext unknown
 */
function listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction, amorphicOptions,
                applicationConfig, applicationSource, applicationSourceMap, applicationPersistorProps, appContext) {

    sendToLog = sendToLogFunction;

    var builder = new configBuilder(new configApi());
    var configStore = builder.build(appDirectory);

    fetchStartUpParams(configStore, amorphicOptions);

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
            promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore, amorphicOptions,
                applicationConfig, applicationSource, applicationSourceMap, applicationPersistorProps));
        }
    }

    Q.all(promises).then(startUpServer.bind(this, preSessionInject, postSessionInject, appList, appStartList,
        appDirectory, mainApp, sessionRouter, amorphicOptions, applicationConfig, applicationSource,
        applicationSourceMap, applicationPersistorProps, sendToLog, appContext))

        .catch(function f(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    listen: listen
};
