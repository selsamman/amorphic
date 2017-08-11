'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let ConfigBuilder = require('./utils/configBuilder').ConfigBuilder;
let ConfigApi = require('./utils/configBuilder').ConfigAPI;
let buildStartUpParams = require('./buildStartUpParams').buildStartUpParams;
let logMessage = require('./utils/logger').logMessage;
let startApplication = require('./startApplication').startApplication;
let startUpServer = require('./startUpServer').startUpServer;

// Npm modules
let connect = require('connect');
let Bluebird = require('bluebird');

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

    let builder = new ConfigBuilder(new ConfigApi());
    let configStore = builder.build(appDirectory);
    let amorphicOptions = AmorphicContext.amorphicOptions;

    if (typeof sendToLogFunction === 'function') {
        AmorphicContext.appContext.sendToLog = sendToLogFunction;
    }

    buildStartUpParams(configStore);

    logMessage('Starting Amorphic with options: ' + JSON.stringify(amorphicOptions));

    sessionStore = sessionStore || new (connect.session.MemoryStore)();

    let sessionRouter = connect.session(
        {
            store: sessionStore,
            secret: amorphicOptions.sessionSecret,
            cookie: {
                maxAge: amorphicOptions.sessionExpiration
            },
            rolling: true
        }
    );

    // Initialize applications
    let appList = amorphicOptions.appList;
    let appStartList = amorphicOptions.appStartList;
    let promises = [];

    for (let appKey in appList) {
        if (appStartList.indexOf(appKey) >= 0) {
            promises.push(startApplication(appKey, appDirectory, appList, configStore, sessionStore));
        }
    }

    Bluebird.all(promises)
        .then(startUpServer.bind(this, preSessionInject, postSessionInject, appList, appStartList, appDirectory,
            sessionRouter))
        .catch(function error(e) {
            logMessage(e.message + ' ' + e.stack);
        });
}

module.exports = {
    listen: listen
};
