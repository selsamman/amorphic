'use strict';
var AmorphicContext = require('./AmorphicContext');
var ConfigBuilder = require('./util/configBuilder').ConfigBuilder;
var ConfigApi = require('./util/configBuilder').ConfigAPI;
var fetchStartUpParams = require('./fetchStartUpParams').fetchStartUpParams;
var logMessage = require('./util/utils').logMessage;
var startApplication = require('./startApplication').startApplication;
var startUpServer = require('./startUpServer').startUpServer;
var connect = require('connect');

var Bluebird = require('bluebird');
var sendToLog = null;

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

    var builder = new ConfigBuilder(new ConfigApi());
    var configStore = builder.build(appDirectory);
    var amorphicOptions = AmorphicContext.amorphicOptions;

    fetchStartUpParams(configStore);

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

    Bluebird.all(promises)
        .then(startUpServer.bind(this, preSessionInject, postSessionInject, appList, appStartList, appDirectory,
            mainApp, sessionRouter, sendToLog))
        .catch(function f(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    listen: listen
};
