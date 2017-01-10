'use strict';

var AmorphicContext = require('./AmorphicContext');
var ConfigBuilder = require('./utils/configBuilder').ConfigBuilder;
var ConfigApi = require('./utils/configBuilder').ConfigAPI;
var fetchStartUpParams = require('./fetchStartUpParams').fetchStartUpParams;
var logMessage = require('./utils/logger').logMessage;
var startApplication = require('./startApplication').startApplication;
var startUpServer = require('./startUpServer').startUpServer;

var connect = require('connect');
var Bluebird = require('bluebird');

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

    var builder = new ConfigBuilder(new ConfigApi());
    var configStore = builder.build(appDirectory);
    var amorphicOptions = AmorphicContext.amorphicOptions;

    AmorphicContext.sendToLog = sendToLogFunction;

    fetchStartUpParams(configStore);

    logMessage('Starting Amorphic with options: ' + JSON.stringify(amorphicOptions));

    sessionStore = sessionStore || new (connect.session.MemoryStore)();

    // TODO: Push this down.
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
            mainApp, sessionRouter))
        .catch(function error(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    listen: listen
};
