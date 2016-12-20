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

var Utils = require('./lib/utils');
var logMessage = Utils.logMessage;
var getTemplates = require('./lib/getTemplates').getTemplates;
var router = require('./lib/router').router;
var displayPerformance = require('./lib/displayPerformance').displayPerformance;
var readFile = require('./lib/readFile').readFile;
var generateDownloadsDir = require('./lib/generateDownloadsDir').generateDownloadsDir;
var fetchStartUpParams = require('./lib/fetchStartUpParams').fetchStartUpParams;
var startApplication = require('./lib/startApplication').startApplication;
var startUpServer = require('./lib/startUpServer').startUpServer;

function localGetTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo) {
    return getTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo,
  amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps);
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
    getTemplates: localGetTemplates,
    listen: listen,
    reset: reset
};
